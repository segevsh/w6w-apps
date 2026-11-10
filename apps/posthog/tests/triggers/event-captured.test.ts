import { test } from "node:test";
import nodeAssert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/event-captured.ts";
import { verifySignature } from "../../lib/triggers.ts";

// This app's generated _assert.ts has no `assert`: use node:assert directly.
const assert = (expr: unknown, msg?: string): void => nodeAssert.ok(expr, msg);

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
// A Standard Webhooks secret is base64 of >= 24 random bytes; built at run time, not a literal.
const KEY_BYTES = Buffer.alloc(32, 7);
const SECRET = KEY_BYTES.toString("base64");
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "event" : { "uuid":"E1",  "event":"$pageview", "distinct_id":"user-1",
  "timestamp":"2026-11-10T10:30:00.000Z", "properties": {"$current_url":"https://example.com/"} },
  "person" : { "id":"P1",   "properties": {"email":"ada@example.com"} } }`;

const nowSec = () => Math.floor(Date.now() / 1000);
// Standard Webhooks: v1,<base64 HMAC-SHA256 of "<id>.<timestamp>.<body>"> under the decoded key.
const sig = (id: string, ts: number, body = BODY, key: Buffer = KEY_BYTES) =>
  `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
const headers = (ts = nowSec(), body = BODY, id = "msg_1") => ({
  "webhook-id": id,
  "webhook-timestamp": String(ts),
  "webhook-signature": sig(id, ts, body),
});

const call = (over: Record<string, unknown> = {}, body: string | null = BODY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: headers() as Record<string, string>,
    body: body === null ? null : JSON.parse(body),
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: { signingSecret: SECRET as string | undefined },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>) =>
  trigger.handleIngest!(input as never, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the manual webhook trigger with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key).slice(0, 1), ["event-captured"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
  assertEquals(typeof trigger.onUnsubscribe, "function");
  assertEquals(trigger.poll, undefined);
});

test("valid Standard Webhooks signature (node:crypto) → one normalized event", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].eventName, "$pageview");
  assertEquals(out[0].eventId, "E1");
  assertEquals(out[0].distinctId, "user-1");
  assertEquals(out[0].webhookId, "msg_1");
  assertEquals((out[0].person as Record<string, unknown>).id, "P1");
});

test("a whsec_-prefixed secret verifies the same deliveries", async () => {
  const c = call();
  c.params.signingSecret = `whsec_${SECRET}`;
  assertEquals(evs(await ingest(c)).length, 1);
});

test("any one of several space-separated signatures may match", async () => {
  const good = sig("msg_1", nowSec());
  const other = sig("msg_1", nowSec(), BODY, Buffer.alloc(32, 9));
  const h = { ...headers(), "webhook-signature": `${other} ${good}` };
  assertEquals(evs(await ingest(call({ headers: h }))).length, 1);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace("user-1", "user-2") })),
    Error,
    "signature does not match",
  );
});

test("signature under another key, or for another webhook-id → refused", async () => {
  const wrongKey = {
    ...headers(),
    "webhook-signature": sig("msg_1", nowSec(), BODY, Buffer.alloc(32, 9)),
  };
  await assertRejects(() => ingest(call({ headers: wrongKey })), Error, "signature does not match");
  const wrongId = { ...headers(), "webhook-id": "msg_2" };
  await assertRejects(() => ingest(call({ headers: wrongId })), Error, "signature does not match");
});

test("a non-v1 signature is refused", async () => {
  const h = { ...headers(), "webhook-signature": sig("msg_1", nowSec()).replace("v1,", "v2,") };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature does not match");
});

test("any of the three headers missing → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "header is missing");
  for (const drop of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
    const h: Record<string, string> = { ...headers() };
    delete h[drop];
    await assertRejects(() => ingest(call({ headers: h })), Error, "header is missing");
  }
});

test("rawBody absent → refused, even with a correct signature", async () => {
  await assertRejects(() => ingest(call({}, null)), Error, "raw body");
});

test("stale timestamp (correctly signed) → refused", async () => {
  const ts = nowSec() - 600;
  await assertRejects(() => ingest(call({ headers: headers(ts) })), Error, "allowed window");
});

test("timestamp window is 300 s either side", async () => {
  const now = 1_800_000_000_000;
  const t = now / 1000;
  const raw = (ts: number) => ({ rawBody: BODY, headers: headers(ts) });
  assertEquals(await verifySignature(raw(t - 299), SECRET, now), BODY);
  assertEquals(await verifySignature(raw(t + 299), SECRET, now), BODY);
  await assertRejects(() => verifySignature(raw(t - 301), SECRET, now), Error, "window");
  await assertRejects(() => verifySignature(raw(t + 301), SECRET, now), Error, "window");
});

test("unset or empty secret + absent or empty headers → refused", async () => {
  for (const secret of [undefined, ""]) {
    for (const h of [{}, { "webhook-id": "", "webhook-timestamp": "", "webhook-signature": "" }]) {
      const c = call({ headers: h });
      c.params.signingSecret = secret;
      await assertRejects(() => ingest(c), Error, "secret");
    }
  }
});

test("a secret that is not base64 is refused without echoing it", async () => {
  const c = call();
  c.params.signingSecret = "not base64 !!";
  try {
    await ingest(c);
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(m.includes("base64") && !m.includes("not base64 !!"));
  }
});

test("errors never echo the secret or the signature", async () => {
  const h = { ...headers(), "webhook-signature": "v1,deadbeefcafe" };
  try {
    await ingest(call({ headers: h }));
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes("deadbeefcafe"));
  }
});

test("a non-POST delivery is refused", async () => {
  await assertRejects(() => ingest(call({ method: "GET" })), Error, "POST");
});

test("manual webhook: onSubscribe makes no vendor call and returns the callback URL", async () => {
  const { ctx, calls } = mockCtx([]);
  const state = await trigger.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await trigger.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
