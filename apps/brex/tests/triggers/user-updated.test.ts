import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import userUpdated from "../../triggers/user-updated.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = Buffer.from("test-secret-bytes-for-brex-0001").toString("base64");
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const nowSec = () => Math.floor(Date.now() / 1000);
const ID = "msg_test0001";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const body = (type: string) =>
  `{ "event_type" : "${type}",
  "user_id":"cuuser_test0001",  "company_id": "cuacc_test0001" }`;
const UPDATED = body("USER_UPDATED");
const OTHER = body("TRANSFER_PROCESSED");

const sig = (b: string, ts: number) =>
  createHmac("sha256", Buffer.from(SECRET, "base64")).update(`${ID}.${ts}.${b}`).digest("base64");
const headersFor = (b: string, ts = nowSec()) => ({
  "webhook-id": ID,
  "webhook-timestamp": String(ts),
  "webhook-signature": `v1,${sig(b, ts)}`,
});
const call = (b: string, over: Record<string, unknown> = {}, secrets: unknown = [SECRET]) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: headersFor(b) as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: {},
  state: { webhookId: "wsub_1", secrets } as never,
  subscriptionId: "sub_1",
});
const ingest = (input: ReturnType<typeof call>) => userUpdated.handleIngest!(input, mockCtx().ctx);

test("user-updated has output, sample, no event-type param and the USER_UPDATED sample", () => {
  assert(JSON.stringify(JSON.parse(UPDATED)) !== UPDATED);
  assert(userUpdated.output!.length > 0);
  assertEquals(userUpdated.params, []);
  assertEquals((userUpdated.sample as { eventType: string }).eventType, "USER_UPDATED");
  assertEquals(userUpdated.poll, undefined);
});

test("a valid USER_UPDATED delivery → one event; any other event type → none", async () => {
  const out = evs(await ingest(call(UPDATED))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].eventType, "USER_UPDATED");
  assertEquals(out[0].webhookId, ID);
  assertEquals(evs(await ingest(call(OTHER))), []);
});

test("one flipped byte of the SIGNATURE itself → refused", async () => {
  const ts = nowSec();
  const good = sig(UPDATED, ts);
  const flipped = (good[0] === "A" ? "B" : "A") + good.slice(1);
  const headers = { ...headersFor(UPDATED, ts), "webhook-signature": `v1,${flipped}` };
  await assertRejects(() => ingest(call(UPDATED, { headers })), Error, "signature");
});

test("one flipped byte in the body → refused", async () => {
  const c = call(UPDATED, { rawBody: UPDATED.replace("cuuser_test0001", "cuuser_test0002") });
  await assertRejects(() => ingest(c), Error, "signature");
});

test("a missing header → refused", async () => {
  for (const name of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
    const headers: Record<string, string> = { ...headersFor(UPDATED) };
    delete headers[name];
    await assertRejects(() => ingest(call(UPDATED, { headers })), Error, "missing");
  }
});

test("rawBody absent → refused", async () => {
  const c = call(UPDATED);
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(c), Error, "raw body");
});

test("a stale timestamp is refused even with a valid signature", async () => {
  const ts = nowSec() - 600;
  await assertRejects(
    () => ingest(call(UPDATED, { headers: headersFor(UPDATED, ts) })),
    Error,
    "timestamp",
  );
});

test("an unset or empty stored secret is refused before any compare", async () => {
  for (const secrets of [[], [""], null]) {
    await assertRejects(() => ingest(call(UPDATED, { headers: {} }, secrets)), Error, "secret");
  }
});

test("onSubscribe registers exactly USER_UPDATED (literal body) and onUnsubscribe deletes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wsub_1" } }, {
    body: [{ secret: SECRET, status: "ACTIVE" }],
  }]);
  const state = await userUpdated.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { webhookId: "wsub_1", secrets: [SECRET] });
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), { url: CALLBACK, event_types: ["USER_UPDATED"] });
  const del = mockCtx([{ status: 204 }]);
  await userUpdated.onUnsubscribe!({ state, subscriptionId: "sub_1" } as never, del.ctx);
  assertEquals(del.calls[0].method, "DELETE");
  assertEquals(new URL(del.calls[0].url).pathname, "/v1/webhooks/wsub_1");
});
