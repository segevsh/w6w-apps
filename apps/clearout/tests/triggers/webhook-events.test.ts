import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import verifierBulk from "../../triggers/email-verifier-bulk-completed.ts";
import finderBulk from "../../triggers/email-finder-bulk-completed.ts";
import formGuard from "../../triggers/form-guard-email-validated.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "account-secret-token-for-tests-0123";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const nowSec = () => Math.floor(Date.now() / 1000);

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const body = (type: string, data: string) =>
  `{ "event_id" : "68b18464a73994ef5ae36608",
  "event_type":"${type}", "event_mode": "live", "event_created_on":"2026-11-10T10:43:48.077Z",
  "payload": { "status":"success",  "data": ${data} } }`;
const BULK = body(
  "email_verifier.bulk.completed",
  `{"list_id":"68b1821500b0b980de170e2d","list_name":"contacts.csv"}`,
);
const FINDER = body(
  "email_finder.bulk.completed",
  `{"list_id":"68b1821500b0b980de170e2e","list_name":"prospects.csv"}`,
);
const FORM = body(
  "form_guard.email_validation.completed",
  `{"result":{"email_address":"ada@example.com","status":"valid"},"page_url":"https://example.com"}`,
);

/** Independent of the app: `t=<ts>,v1=<hex HMAC-SHA256 of "<ts>.<raw body>">`. */
const sign = (b: string, ts = nowSec(), secret = SECRET) =>
  `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${b}`).digest("hex")}`;

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secret: string | undefined | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-co-webhook-signature": sign(b) } as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: { signingSecret: secret === null ? undefined : secret },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof verifierBulk, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);
const withSig = (b: string, signature: string) =>
  call(b, { headers: { "x-co-webhook-signature": signature } });

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BULK)) !== BULK);
});

test("app declares the three webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "email-verifier-bulk-completed",
    "email-finder-bulk-completed",
    "form-guard-email-validated",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(t.params!.map((p) => p.key), ["signingSecret"]);
  }
});

test("valid signature → one normalized event per event type", async () => {
  const a = evs(await ingest(verifierBulk, call(BULK))) as Array<Record<string, unknown>>;
  assertEquals(a.length, 1);
  assertEquals(a[0].eventType, "email_verifier.bulk.completed");
  assertEquals(a[0].eventId, "68b18464a73994ef5ae36608");
  assertEquals(a[0].eventMode, "live");
  assertEquals(a[0].status, "success");
  assertEquals((a[0].data as Record<string, unknown>).list_id, "68b1821500b0b980de170e2d");
  const b = evs(await ingest(finderBulk, call(FINDER))) as Array<Record<string, unknown>>;
  assertEquals((b[0].data as Record<string, unknown>).list_name, "prospects.csv");
  const c = evs(await ingest(formGuard, call(FORM))) as Array<Record<string, unknown>>;
  assertEquals(c[0].eventType, "form_guard.email_validation.completed");
});

test("another event type is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(verifierBulk, call(FINDER))), []);
});

test("a delivery spelling the time `event_on` still maps createdAt", async () => {
  const b = FINDER.replace('"event_created_on"', '"event_on"');
  const out = evs(await ingest(finderBulk, call(b))) as Array<Record<string, unknown>>;
  assertEquals(out[0].createdAt, "2026-11-10T10:43:48.077Z");
});

test("one flipped byte in the body → refused", async () => {
  const forged = BULK.replace("contacts.csv", "contacts.csw");
  await assertRejects(
    () => ingest(verifierBulk, call(forged, { headers: { "x-co-webhook-signature": sign(BULK) } })),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused", async () => {
  const c = withSig(BULK, sign(BULK, nowSec(), "another-secret-value-xxxxxxxx"));
  await assertRejects(() => ingest(verifierBulk, c), Error, "signature");
});

test("a signature over a different timestamp → refused", async () => {
  const t = nowSec();
  const h = sign(BULK, t).replace(`t=${t}`, `t=${t + 1}`);
  await assertRejects(() => ingest(verifierBulk, withSig(BULK, h)), Error, "signature");
});

test("header missing or malformed → refused", async () => {
  await assertRejects(
    () => ingest(verifierBulk, call(BULK, { headers: {} })),
    Error,
    "x-co-webhook-signature",
  );
  for (const h of ["v1=abc", "t=123", "garbage", "t=abc,v1=00"]) {
    await assertRejects(() => ingest(verifierBulk, withSig(BULK, h)), Error);
  }
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(BULK);
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(verifierBulk, c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const headers of [{}, { "x-co-webhook-signature": "" }]) {
      await assertRejects(
        () => ingest(verifierBulk, call(BULK, { headers }, secret)),
        Error,
        "secret",
      );
    }
  }
});

test("a stale or future timestamp is refused even when the signature is valid", async () => {
  for (const delta of [-600, 600]) {
    const c = withSig(BULK, sign(BULK, nowSec() + delta));
    await assertRejects(() => ingest(verifierBulk, c), Error, "timestamp");
  }
  // Inside the window both sides are accepted.
  for (const delta of [-200, 200]) {
    const out = evs(await ingest(verifierBulk, withSig(BULK, sign(BULK, nowSec() + delta))));
    assertEquals(out.length, 1);
  }
});

test("a body with leading and trailing whitespace is verified over the exact bytes", async () => {
  const b = `\n  ${BULK}  \n`;
  assertEquals(evs(await ingest(verifierBulk, withSig(b, sign(b)))).length, 1);
  await assertRejects(() => ingest(verifierBulk, withSig(b, sign(b.trim()))), Error, "signature");
});

test("errors never contain the secret, the signature or the header value", async () => {
  const sig = sign(BULK, nowSec(), "another-secret-value-xxxxxxxx");
  try {
    await ingest(verifierBulk, withSig(BULK, sig));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig) && !m.includes(sig.split("v1=")[1]));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(
    () => ingest(verifierBulk, call(BULK, { method: "GET" })),
    Error,
    "POST",
  );
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await verifierBulk.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await verifierBulk.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
