import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { errorBody, mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import event from "../../triggers/event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
// Brex secrets are base64; these decode to obviously fake bytes.
const SECRET = Buffer.from("test-secret-bytes-for-brex-0001").toString("base64");
const NEXT = Buffer.from("test-secret-bytes-for-brex-0002").toString("base64");
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const nowSec = () => Math.floor(Date.now() / 1000);
const ID = "msg_test0001";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const body = (type: string) =>
  `{ "event_type" : "${type}",
  "transfer_id":"dptx_test0001",  "company_id": "cuacc_test0001" }`;
const PROCESSED = body("TRANSFER_PROCESSED");
const FAILED = body("TRANSFER_FAILED");

/** Independent of the app: base64 HMAC-SHA256 of `<id>.<ts>.<body>` under the base64-decoded secret. */
const sig = (b: string, ts: number, secret = SECRET, id = ID) =>
  createHmac("sha256", Buffer.from(secret, "base64")).update(`${id}.${ts}.${b}`).digest("base64");

const headersFor = (b: string, ts = nowSec(), secret = SECRET) => ({
  "webhook-id": ID,
  "webhook-timestamp": String(ts),
  "webhook-signature": `v1,${sig(b, ts, secret)}`,
});

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secrets: unknown = [SECRET],
  params: Record<string, unknown> = {},
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: headersFor(b) as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params,
  state: { webhookId: "wsub_1", secrets } as never,
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>) => event.handleIngest!(input, mockCtx().ctx);
const sub = {
  params: {},
  subscriptionId: "sub_1",
  callbackUrl: CALLBACK,
  hostUrl: "",
};
const pathOf = (url: string) => new URL(url).pathname;

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(PROCESSED)) !== PROCESSED);
});

test("app declares the webhook trigger with output, sample and an event-type param", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "event",
    "user-updated",
    "new-user",
    "new-card",
    "new-department",
    "new-location",
    "new-title",
    "new-legal-entity",
  ]);
  const t = app.triggers[0];
  assert(t.output!.length > 0);
  assert(t.sample !== undefined);
  assertEquals(t.poll, undefined);
  assertEquals(t.params!.map((p) => p.key), ["eventTypes"]);
});

test("valid signature → one normalized event", async () => {
  const out = evs(await ingest(call(PROCESSED))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].eventType, "TRANSFER_PROCESSED");
  assertEquals(out[0].webhookId, ID);
  assertEquals(out[0].companyId, "cuacc_test0001");
  assertEquals(typeof out[0].timestamp, "number");
  assertEquals((out[0].data as Record<string, unknown>).transfer_id, "dptx_test0001");
});

test("an event type the user did not pick is acknowledged with no event", async () => {
  assertEquals(
    evs(await ingest(call(FAILED, {}, [SECRET], { eventTypes: "transfer_processed" }))),
    [],
  );
  assertEquals(
    evs(await ingest(call(PROCESSED, {}, [SECRET], { eventTypes: "transfer_processed" }))).length,
    1,
  );
});

test("during a rotation either stored secret verifies, and any v1 entry in the header", async () => {
  const ts = nowSec();
  const both = [SECRET, NEXT];
  const h = (value: string) => ({
    "webhook-id": ID,
    "webhook-timestamp": String(ts),
    "webhook-signature": value,
  });
  // Signed with the newer secret only.
  assertEquals(
    evs(await ingest(call(PROCESSED, { headers: h(`v1,${sig(PROCESSED, ts, NEXT)}`) }, both)))
      .length,
    1,
  );
  // Two signatures, only the second valid.
  const two = `v1,${sig(PROCESSED, ts, "AAAAAAAAAAAAAAAA")} v1,${sig(PROCESSED, ts)}`;
  assertEquals(evs(await ingest(call(PROCESSED, { headers: h(two) }, both))).length, 1);
  // A v2 entry is not accepted as a v1 signature.
  await assertRejects(
    () => ingest(call(PROCESSED, { headers: h(`v2,${sig(PROCESSED, ts)}`) })),
    Error,
    "missing",
  );
});

test("a stored secret written with a whsec_ prefix verifies either reading", async () => {
  const prefixed = `whsec_${SECRET}`;
  const ts = nowSec();
  // Signed with the base64-decoded remainder (Standard Webhooks convention).
  assertEquals(
    evs(await ingest(call(PROCESSED, { headers: headersFor(PROCESSED, ts, SECRET) }, [prefixed])))
      .length,
    1,
  );
  // Signed with the whole string decoded (the Brex guide's literal reading).
  const whole = createHmac("sha256", Buffer.from(prefixed, "base64"))
    .update(`${ID}.${ts}.${PROCESSED}`).digest("base64");
  const headers = { ...headersFor(PROCESSED, ts), "webhook-signature": `v1,${whole}` };
  assertEquals(evs(await ingest(call(PROCESSED, { headers }, [prefixed]))).length, 1);
});

test("one flipped byte of the SIGNATURE itself → refused", async () => {
  const ts = nowSec();
  const good = sig(PROCESSED, ts);
  const flipped = (good[0] === "A" ? "B" : "A") + good.slice(1);
  const headers = { ...headersFor(PROCESSED, ts), "webhook-signature": `v1,${flipped}` };
  await assertRejects(() => ingest(call(PROCESSED, { headers })), Error, "signature");
});

test("one flipped byte in the body → refused", async () => {
  const c = call(PROCESSED, { rawBody: PROCESSED.replace("dptx_test0001", "dptx_test0002") });
  await assertRejects(() => ingest(c), Error, "signature");
});

test("signature made with another secret → refused", async () => {
  const c = call(PROCESSED, { headers: headersFor(PROCESSED, nowSec(), NEXT) });
  await assertRejects(() => ingest(c), Error, "signature");
});

test("a signature over a different delivery id → refused", async () => {
  const ts = nowSec();
  const headers = { ...headersFor(PROCESSED, ts), "webhook-id": "msg_other" };
  await assertRejects(() => ingest(call(PROCESSED, { headers })), Error, "signature");
});

test("any missing signature header → refused", async () => {
  for (const name of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
    const headers: Record<string, string> = { ...headersFor(PROCESSED) };
    delete headers[name];
    await assertRejects(() => ingest(call(PROCESSED, { headers })), Error, "missing");
  }
  await assertRejects(() => ingest(call(PROCESSED, { headers: {} })), Error, "missing");
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(PROCESSED);
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(c), Error, "raw body");
});

test("unset or empty stored secrets + absent or empty header → refused", async () => {
  for (const secrets of [[], [""], null]) {
    for (
      const headers of [{}, { "webhook-id": ID, "webhook-timestamp": "1", "webhook-signature": "" }]
    ) {
      await assertRejects(() => ingest(call(PROCESSED, { headers }, secrets)), Error, "secret");
    }
  }
});

test("a stale or future timestamp is refused even when the signature is valid", async () => {
  for (const delta of [-600, 600]) {
    const ts = nowSec() + delta;
    await assertRejects(
      () => ingest(call(PROCESSED, { headers: headersFor(PROCESSED, ts) })),
      Error,
      "timestamp",
    );
  }
  for (const delta of [-200, 200]) {
    const ts = nowSec() + delta;
    assertEquals(
      evs(await ingest(call(PROCESSED, { headers: headersFor(PROCESSED, ts) }))).length,
      1,
    );
  }
  const bad = { ...headersFor(PROCESSED), "webhook-timestamp": "12abc" };
  await assertRejects(() => ingest(call(PROCESSED, { headers: bad })), Error, "malformed");
});

test("a body with leading and trailing whitespace is verified over the exact bytes", async () => {
  const b = `\n  ${PROCESSED}  \n`;
  assertEquals(evs(await ingest(call(b, { headers: headersFor(b) }))).length, 1);
  await assertRejects(
    () => ingest(call(b, { headers: headersFor(b.trim()) })),
    Error,
    "signature",
  );
});

test("a signed body that is not a Brex event is refused", async () => {
  const signedRaw = (b: string) => call(PROCESSED, { rawBody: b, headers: headersFor(b) });
  await assertRejects(() => ingest(signedRaw('{"a":1}')), Error, "event_type");
  await assertRejects(() => ingest(signedRaw("not json")), Error, "not JSON");
});

test("errors never contain a secret, a signature or a header value", async () => {
  const ts = nowSec();
  const wrong = sig(PROCESSED, ts, NEXT);
  try {
    await ingest(call(PROCESSED, { headers: headersFor(PROCESSED, ts, NEXT) }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(NEXT) && !m.includes(wrong) && !m.includes(ID));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(call(PROCESSED, { method: "GET" })), Error, "POST");
});

test("onSubscribe registers the webhook on /v1, reads the secrets and keeps both live ones", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { id: "wsub_1", url: CALLBACK, event_types: ["TRANSFER_PROCESSED"], status: "ACTIVE" },
    },
    {
      body: [
        { secret: SECRET, status: "ACTIVE" },
        { secret: NEXT, status: "PENDING_REVOKE" },
        { secret: "old-secret", status: "REVOKED" },
      ],
    },
  ]);
  const state = await event.onSubscribe!(
    { ...sub, params: { eventTypes: "transfer_processed, user_updated" } },
    ctx,
  );
  assertEquals(state, { webhookId: "wsub_1", secrets: [SECRET, NEXT] });
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).origin, "https://api.brex.com");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(calls[0].headers["idempotency-key"], "w6w-sub_1");
  assertEquals(JSON.parse(calls[0].body!), {
    url: CALLBACK,
    event_types: ["TRANSFER_PROCESSED", "USER_UPDATED"],
  });
  assertEquals(calls[1].method, "GET");
  assertEquals(pathOf(calls[1].url), "/v1/webhooks/secrets");
});

test("onSubscribe with no event types registers every supported one", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wsub_1" } }, {
    body: [{ secret: SECRET, status: "ACTIVE" }],
  }]);
  await event.onSubscribe!(sub, ctx);
  assertEquals(JSON.parse(calls[0].body!).event_types.length, 8);
});

test("an unknown event type is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => event.onSubscribe!({ ...sub, params: { eventTypes: "CARD_CREATED" } }, ctx),
    Error,
    "CARD_CREATED",
  );
  assertEquals(calls.length, 0);
});

test("onSubscribe that cannot read a secret deletes the webhook again and throws", async () => {
  for (const second of [{ body: [] }, { status: 403, body: errorBody("FORBIDDEN", "no scope") }]) {
    const { ctx, calls } = mockCtx([{ body: { id: "wsub_9" } }, second, { status: 200 }]);
    await assertRejects(() => event.onSubscribe!(sub, ctx), Error);
    assertEquals(calls.length, 3);
    assertEquals(calls[2].method, "DELETE");
    assertEquals(pathOf(calls[2].url), "/v1/webhooks/wsub_9");
  }
});

test("onUnsubscribe deletes the webhook; one already gone (404) counts as deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await event.onUnsubscribe!(
    { params: {}, state: { webhookId: "wsub_1", secrets: [SECRET] }, subscriptionId: "sub_1" },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/wsub_1");
  const gone = mockCtx([{ status: 404, body: errorBody("NOT_FOUND", "no such webhook") }]);
  await event.onUnsubscribe!(
    { params: {}, state: { webhookId: "wsub_1", secrets: [SECRET] }, subscriptionId: "sub_1" },
    gone.ctx,
  );
  assertEquals(gone.calls.length, 1);
});

test("onUnsubscribe propagates a real failure and ignores a subscription with no webhook id", async () => {
  const m = mockCtx([{ status: 500, body: errorBody("INTERNAL", "boom") }]);
  await assertRejects(
    () =>
      event.onUnsubscribe!(
        { params: {}, state: { webhookId: "wsub_1", secrets: [] }, subscriptionId: "sub_1" },
        m.ctx,
      ),
    Error,
    "500",
  );
  const n = mockCtx();
  await event.onUnsubscribe!({ params: {}, state: {} as never, subscriptionId: "sub_1" }, n.ctx);
  assertEquals(n.calls.length, 0);
});
