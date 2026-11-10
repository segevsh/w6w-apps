import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/watch-event.ts";
import { verifySignature } from "../../lib/triggers.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-webhook-secret-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "event" : "watch.changed",  "status":"changed", "watchId":"W1", "runId":"R1",
  "url":"https://example.com/pricing", "changed":true, "diffScore":0.04, "diffPixels":18240,
  "summary":"A new tier was added.", "textDiff": {"added":["New tier"], "removed":[]},
  "beforeUrl":"https://api.rendex.dev/v1/images/b", "afterUrl":"https://api.rendex.dev/v1/images/a",
  "completedAt":"2026-11-10T12:00:00Z" }`;

const nowSec = () => Math.floor(Date.now() / 1000);
// Vendor scheme: hex HMAC-SHA256 of "<timestamp>.<body>"
const sig = (ts: number, body = BODY, secret = SECRET) =>
  createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
const headers = (ts = nowSec(), body = BODY) => ({
  "x-rendex-signature": sig(ts, body),
  "x-rendex-timestamp": String(ts),
  "x-rendex-event": "watch.changed",
  "x-rendex-delivery-id": "del-1",
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
  params: {
    watchId: "W1",
    signingSecret: SECRET as string | undefined,
    events: undefined as string | undefined,
  },
  state: { watchId: "W1" },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>) =>
  trigger.handleIngest!(input as never, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares the webhook trigger with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), ["watch-event"]);
  assert(trigger.output!.length > 0);
  assert(trigger.sample !== undefined);
  assertEquals(typeof trigger.onSubscribe, "function");
  assertEquals(typeof trigger.onUnsubscribe, "function");
  assertEquals(trigger.poll, undefined);
});

test("valid signature (node:crypto) → one normalized event", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].event, "watch.changed");
  assertEquals(out[0].watchId, "W1");
  assertEquals(out[0].summary, "A new tier was added.");
  assertEquals(out[0].diffScore, 0.04);
  assertEquals(out[0].deliveryId, "del-1");
  assertEquals(out[0].textDiff, { added: ["New tier"], removed: [] });
});

test("events param filters: a recovered delivery is dropped when only `changed` is chosen", async () => {
  const body = BODY.replace("watch.changed", "watch.recovered");
  const c = call({ rawBody: body, headers: headers(nowSec(), body) });
  assertEquals(evs(await ingest(c)).length, 1);
  c.params.events = "changed";
  assertEquals(evs(await ingest(c)), []);
});

test("a signed job.completed (not a watch alert) is acknowledged with no event", async () => {
  const body = `{ "event" : "job.completed", "jobId":"J1" }`;
  const c = call({ rawBody: body, headers: headers(nowSec(), body) });
  assertEquals(evs(await ingest(c)), []);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace("W1", "W2") })),
    Error,
    "signature does not match",
  );
});

test("signature under another secret → refused", async () => {
  const h = {
    ...headers(),
    "x-rendex-signature": sig(nowSec(), BODY, "some-other-secret-xxxxxxxxxxxx"),
  };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature does not match");
});

test("signature or timestamp header missing → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "header is missing");
  const { "x-rendex-timestamp": _t, ...noTs } = headers();
  await assertRejects(() => ingest(call({ headers: noTs })), Error, "header is missing");
  const { "x-rendex-signature": _s, ...noSig } = headers();
  await assertRejects(() => ingest(call({ headers: noSig })), Error, "header is missing");
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
  const raw = (ts: number) => ({
    rawBody: BODY,
    headers: { "x-rendex-signature": sig(ts), "x-rendex-timestamp": String(ts) },
  });
  assertEquals(await verifySignature(raw(t - 299), SECRET, now), BODY);
  assertEquals(await verifySignature(raw(t + 299), SECRET, now), BODY);
  await assertRejects(() => verifySignature(raw(t - 301), SECRET, now), Error, "window");
  await assertRejects(() => verifySignature(raw(t + 301), SECRET, now), Error, "window");
});

test("unset or empty secret + absent or empty headers → refused", async () => {
  for (const secret of [undefined, ""]) {
    for (const h of [{}, { "x-rendex-signature": "", "x-rendex-timestamp": "" }]) {
      const c = call({ headers: h });
      c.params.signingSecret = secret;
      await assertRejects(() => ingest(c), Error, "secret");
    }
  }
});

test("errors never echo the secret or the signature", async () => {
  const h = { ...headers(), "x-rendex-signature": "deadbeefcafe" };
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

test("onSubscribe PATCHes the watch's webhookUrl and keeps the watch id", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: "W1" } } }]);
  const state = await trigger.onSubscribe!(
    { params: { watchId: " W1 " }, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { watchId: "W1" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://api.rendex.dev/v1/watches/W1");
  assertEquals(JSON.parse(calls[0].body!), { webhookUrl: CALLBACK });
});

test("onSubscribe refuses an empty watch id and unknown events without calling Rendex", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      trigger.onSubscribe!({
        params: { watchId: "" },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "",
      }, ctx),
    Error,
    "Watch",
  );
  await assertRejects(
    () =>
      trigger.onSubscribe!(
        {
          params: { watchId: "W1", events: "bogus" },
          subscriptionId: "s",
          callbackUrl: CALLBACK,
          hostUrl: "",
        },
        ctx,
      ),
    Error,
    "Unknown",
  );
  assertEquals(calls.length, 0);
});

test("onUnsubscribe clears the webhook URL with null; 404 and 410 = gone; 500 rethrows", async () => {
  const input = { params: { watchId: "W1" }, state: { watchId: "W1" }, subscriptionId: "sub_1" };
  const ok = mockCtx([{ body: { success: true, data: {} } }]);
  await trigger.onUnsubscribe!(input, ok.ctx);
  assertEquals(ok.calls[0].method, "PATCH");
  assertEquals(ok.calls[0].url, "https://api.rendex.dev/v1/watches/W1");
  assertEquals(JSON.parse(ok.calls[0].body!), { webhookUrl: null });
  const gone = mockCtx([{
    status: 404,
    body: { success: false, error: { code: "NOT_FOUND", message: "no watch" } },
  }]);
  await trigger.onUnsubscribe!(input, gone.ctx);
  const goneToo = mockCtx([{ status: 410, body: { success: false, error: { code: "GONE" } } }]);
  await trigger.onUnsubscribe!(input, goneToo.ctx);
  const bad = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(() => trigger.onUnsubscribe!(input, bad.ctx), Error, "500");
});
