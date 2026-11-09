import { test } from "node:test";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { ok as assert } from "node:assert";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newConversation from "../../triggers/new-conversation.ts";
import customerReplied from "../../triggers/customer-replied.ts";
import conversationStatusChanged from "../../triggers/conversation-status-changed.ts";
import newCustomer from "../../triggers/new-customer.ts";

const SECRET = "mZ9XbGHodX0123456789abcdef0123456789abcd";
const STATE = { webhookId: "10", event: "convo.created", secret: SECRET };

/** Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY. */
const BODY =
  '{ "id": 3443157477,  "number": 1432,\n  "status": "active", "subject": "Where is my order?",\n  "primaryCustomer": { "id": 7123 }  }';

/** Narrow the `E[] | { events, response? }` union (brief §3). */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Expected signature, computed independently of the app: base64(HMAC-SHA1(secret, body)). */
const sign = (body: string, secret = SECRET) =>
  createHmac("sha1", secret).update(body).digest("base64");

function call(
  headers: Record<string, string>,
  rawBody: string | null = BODY,
  method = "POST",
): TriggerCall {
  const raw: TriggerCall = { method, path: "/hook", query: {}, headers, body: null };
  if (rawBody !== null) {
    raw.rawBody = rawBody;
    raw.body = JSON.parse(rawBody);
  }
  return raw;
}

const signed = (body = BODY) => ({
  "x-helpscout-signature": sign(body),
  "x-helpscout-event": "convo.created",
});

async function ingest(raw: TriggerCall, state: unknown = STATE, trigger = newConversation) {
  const { ctx } = mockCtx();
  return await trigger.handleIngest!(
    { raw, params: {}, state: state as typeof STATE, subscriptionId: "sub-1" },
    ctx,
  );
}

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("handleIngest: a valid signature over the exact bytes yields the event", async () => {
  const out = evs(await ingest(call(signed())));
  assertEquals(out, [{
    event: "convo.created",
    resourceId: "3443157477",
    resource: JSON.parse(BODY),
  }]);
});

test("handleIngest: a one-byte change to the body throws", async () => {
  const headers = signed();
  await assertRejects(
    () => ingest(call(headers, BODY.replace("active", "activf"))),
    Error,
    "refused",
  );
});

test("handleIngest: a flipped signature byte throws without echoing it", async () => {
  const good = sign(BODY);
  const bad = (good[0] === "A" ? "B" : "A") + good.slice(1);
  const err = await assertRejects(() => ingest(call({ "x-helpscout-signature": bad })));
  assert(err.message.includes("refused"));
  assert(!err.message.includes(bad) && !err.message.includes(SECRET));
});

test("handleIngest: a signature made with another secret throws", async () => {
  await assertRejects(
    () => ingest(call({ "x-helpscout-signature": sign(BODY, "another-secret") })),
    Error,
    "refused",
  );
});

test("handleIngest: a signature over the re-serialised body does not verify", async () => {
  const reserialised = JSON.stringify(JSON.parse(BODY));
  await assertRejects(
    () => ingest(call({ "x-helpscout-signature": sign(reserialised) })),
    Error,
    "refused",
  );
});

test("handleIngest: a missing or empty signature header throws", async () => {
  await assertRejects(() => ingest(call({})), Error, "refused");
  await assertRejects(() => ingest(call({ "x-helpscout-signature": "" })), Error, "refused");
});

test("handleIngest: an absent rawBody throws", async () => {
  await assertRejects(() => ingest(call(signed(), null)), Error, "raw body");
});

test("handleIngest: an unset or empty secret refuses even with an absent or empty header", async () => {
  for (const state of [null, {}, { ...STATE, secret: "" }]) {
    for (const raw of [call({}), call({ "x-helpscout-signature": "" }), call(signed())]) {
      await assertRejects(() => ingest(raw, state), Error, "secret");
    }
  }
});

test("handleIngest: a non-POST delivery throws", async () => {
  await assertRejects(() => ingest(call(signed(), null, "GET")), Error, "POST");
});

test("handleIngest: a verified delivery of another event is acknowledged, not emitted", async () => {
  const headers = { ...signed(), "x-helpscout-event": "convo.status" };
  assertEquals(evs(await ingest(call(headers))), []);
});

test("handleIngest: a verified body that is not JSON throws a body error", async () => {
  const body = "not json {";
  const raw: TriggerCall = {
    method: "POST",
    path: "/hook",
    query: {},
    headers: { "x-helpscout-signature": sign(body) },
    body,
    rawBody: body,
  };
  await assertRejects(() => ingest(raw), Error, "not valid JSON");
});

test("triggers: each declares output, sample and webhook hooks", () => {
  for (const t of [newConversation, customerReplied, conversationStatusChanged, newCustomer]) {
    assert((t.output as unknown[]).length > 0, `${t.key} output`);
    assert(t.sample !== undefined, `${t.key} sample`);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof t.handleIngest, "function");
    assertEquals(t.poll, undefined);
  }
  assertEquals(newCustomer.params, []);
  assertEquals(newConversation.params!.map((p) => p.key), ["mailboxIds"]);
});

const subscribeInput = {
  params: { mailboxIds: "85, 86" },
  subscriptionId: "sub-1",
  callbackUrl: "https://w6w.example/hook/abc",
  hostUrl: "https://w6w.example",
};

test("onSubscribe: creates the webhook with a fresh 40-char secret and keeps it in state", async () => {
  const { ctx, calls } = mockCtx([
    { body: { _embedded: { webhooks: [] }, page: { totalPages: 1 } } },
    {
      status: 201,
      headers: { "resource-id": "10", location: "https://api.helpscout.net/v2/webhooks/10" },
    },
  ]);
  const state = await newConversation.onSubscribe!(subscribeInput, ctx);
  assertEquals(state.webhookId, "10");
  assertEquals(state.event, "convo.created");
  assert(/^[0-9a-f]{40}$/.test(state.secret), "secret is 40 hex chars");
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.helpscout.net/v2/webhooks?page=1");
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].url, "https://api.helpscout.net/v2/webhooks");
  assertEquals(JSON.parse(calls[1].body!), {
    url: "https://w6w.example/hook/abc",
    events: ["convo.created"],
    secret: state.secret,
    payloadVersion: "V3",
    label: "w6w sub-1",
    mailboxIds: [85, 86],
  });
});

test("onSubscribe: a customer trigger sends no inbox filter; two subscriptions get different secrets", async () => {
  const make = () =>
    mockCtx([
      { body: { _embedded: { webhooks: [] } } },
      { status: 201, headers: { "resource-id": "11" } },
    ]);
  const a = make();
  const b = make();
  const input = { ...subscribeInput, params: { mailboxIds: "85" } };
  const s1 = await newCustomer.onSubscribe!(input, a.ctx);
  const s2 = await newCustomer.onSubscribe!(input, b.ctx);
  assert(!("mailboxIds" in JSON.parse(a.calls[1].body!)));
  assertEquals(JSON.parse(a.calls[1].body!).events, ["customer.created"]);
  assert(s1.secret !== s2.secret);
});

test("onSubscribe: finds the id by callback URL when the Resource-ID header is not exposed", async () => {
  const listed = {
    _embedded: { webhooks: [{ id: 12, url: "https://w6w.example/hook/abc" }] },
    page: { totalPages: 1 },
  };
  const { ctx } = mockCtx([
    { body: { _embedded: { webhooks: [] } } },
    { status: 201, headers: {} },
    { body: listed },
  ]);
  const state = await newConversation.onSubscribe!(subscribeInput, ctx);
  assertEquals(state.webhookId, "12");
});

test("onSubscribe: deletes a leftover webhook that already points at the callback URL", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        _embedded: {
          webhooks: [
            { id: 5, url: "https://w6w.example/hook/abc" },
            { id: 6, url: "https://elsewhere.example/h" },
          ],
        },
        page: { totalPages: 1 },
      },
    },
    { status: 204 },
    { status: 201, headers: { "resource-id": "13" } },
  ]);
  await newConversation.onSubscribe!(subscribeInput, ctx);
  assertEquals(calls[1].method, "DELETE");
  assertEquals(calls[1].url, "https://api.helpscout.net/v2/webhooks/5");
  assertEquals(calls.filter((c) => c.method === "DELETE").length, 1);
});

test("onSubscribe: a malformed inbox id is rejected before any webhook is created", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => newConversation.onSubscribe!({ ...subscribeInput, params: { mailboxIds: "abc" } }, ctx),
    Error,
    "Inbox ID",
  );
  assertEquals(calls.length, 0);
});

test("onUnsubscribe: deletes the webhook; 404 and 410 count as already gone", async () => {
  for (const status of [204, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status, body: status === 204 ? undefined : "gone" }]);
    await newConversation.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, ctx);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "DELETE");
    assertEquals(calls[0].url, "https://api.helpscout.net/v2/webhooks/10");
  }
});

test("onUnsubscribe: any other failure propagates; no state means no call", async () => {
  const failing = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(
    () =>
      newConversation.onUnsubscribe!(
        { params: {}, state: STATE, subscriptionId: "s" },
        failing.ctx,
      ),
    Error,
    "500",
  );
  const idle = mockCtx();
  await newConversation.onUnsubscribe!(
    { params: {}, state: undefined as unknown as typeof STATE, subscriptionId: "s" },
    idle.ctx,
  );
  assertEquals(idle.calls.length, 0);
});
