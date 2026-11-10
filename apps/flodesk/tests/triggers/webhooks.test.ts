import { test } from "node:test";
import { assert, assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newSubscriber from "../../triggers/new-subscriber.ts";
import unsubscribed from "../../triggers/subscriber-unsubscribed.ts";
import addedToSegment from "../../triggers/subscriber-added-to-segment.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

const payload = (event = "subscriber.created") => ({
  event_name: event,
  event_time: "2026-11-10T09:30:00.000Z",
  webhook_id: "wh_1",
  subscriber: {
    id: "sub_abc",
    status: "active",
    email: "jane@example.com",
    first_name: "Jane",
    segments: [],
  },
  ...(event === "subscriber.added_to_segment"
    ? { segment: { id: "seg_1", name: "Newsletter" } }
    : {}),
});

const call = (body: unknown, over: Record<string, unknown> = {}) => ({
  raw: { method: "POST", path: "/", query: {}, headers: {}, body, ...over },
  params: {},
  state: { webhookId: "wh_1" },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof newSubscriber, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("app declares the poll trigger plus three unsigned webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "new-segment",
    "new-subscriber",
    "subscriber-unsubscribed",
    "subscriber-added-to-segment",
  ]);
  for (const t of app.triggers.slice(1)) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
  }
});

test("a delivery is parsed into one normalized event", async () => {
  const out = evs(await ingest(newSubscriber, call(payload()))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].eventName, "subscriber.created");
  assertEquals(out[0].eventTime, "2026-11-10T09:30:00.000Z");
  assertEquals(out[0].webhookId, "wh_1");
  assertEquals(out[0].subscriberId, "sub_abc");
  assertEquals(out[0].email, "jane@example.com");
  assertEquals(out[0].segment, null);
  assertEquals((out[0].subscriber as Record<string, unknown>).first_name, "Jane");
});

test("a body delivered as JSON text parses the same", async () => {
  const text = `{ "event_name" : "subscriber.unsubscribed",
    "subscriber": { "id" : "sub_abc", "email":"jane@example.com" } }`;
  const out = evs(await ingest(unsubscribed, call(text))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].eventName, "subscriber.unsubscribed");
});

test("the segment event carries the segment", async () => {
  const out = evs(
    await ingest(addedToSegment, call(payload("subscriber.added_to_segment"))),
  ) as Array<Record<string, unknown>>;
  assertEquals(out[0].segment, { id: "seg_1", name: "Newsletter" });
});

test("each trigger keeps only its own event", async () => {
  assertEquals(evs(await ingest(newSubscriber, call(payload("subscriber.unsubscribed")))), []);
  assertEquals(evs(await ingest(unsubscribed, call(payload("subscriber.created")))), []);
  assertEquals(evs(await ingest(addedToSegment, call(payload("subscriber.created")))), []);
});

test("a non-POST call, a non-JSON body and a non-event body are refused", () => {
  // handleIngest is synchronous, so a refusal is a synchronous throw.
  assertThrows(() => ingest(newSubscriber, call(payload(), { method: "GET" })), Error, "POST");
  assertThrows(() => ingest(newSubscriber, call("not json")), Error, "not JSON");
  assertThrows(() => ingest(newSubscriber, call({ hello: "world" })), Error, "Not a Flodesk");
  assertThrows(() => ingest(newSubscriber, call(null)), Error, "Not a Flodesk");
});

test("onSubscribe POSTs the webhook (name, post_url, one event) and keeps its id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_9", post_url: CALLBACK } }]);
  const state = await unsubscribed.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { webhookId: "wh_9" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "w6w-sub_1",
    post_url: CALLBACK,
    events: ["subscriber.unsubscribed"],
  });
});

test("onSubscribe refuses an answer without a webhook id", async () => {
  const { ctx } = mockCtx([{ status: 201, body: {} }]);
  await assertRejects(
    () =>
      newSubscriber.onSubscribe!(
        { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "id of the webhook",
  );
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 are already gone; 500 propagates", async () => {
  const state = { webhookId: "wh_9" };
  const ok = mockCtx([{ status: 204 }]);
  await newSubscriber.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, ok.ctx);
  assertEquals(ok.calls.length, 1);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/v1/webhooks/wh_9");
  for (const status of [404, 410]) {
    const gone = mockCtx([{ status, body: { message: "not found" } }]);
    await newSubscriber.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);
    assertEquals(gone.calls.length, 1);
  }
  const boom = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(() =>
    newSubscriber.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, boom.ctx)
  );
});

test("onUnsubscribe with no stored webhook makes no call", async () => {
  const { ctx, calls } = mockCtx();
  await newSubscriber.onUnsubscribe!({ params: {}, state: {}, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});
