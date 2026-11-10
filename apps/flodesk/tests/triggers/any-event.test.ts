import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import anyEvent from "../../triggers/any-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const body = (event: string) => ({
  event_name: event,
  event_time: "2026-11-10T09:30:00.000Z",
  webhook_id: "wh_1",
  subscriber: { id: "sub_abc", email: "jane@example.com" },
});
const call = (event: string, params: Record<string, unknown> = {}) => ({
  raw: { method: "POST", path: "/", query: {}, headers: {}, body: body(event) },
  params,
  state: { webhookId: "wh_1" },
  subscriptionId: "sub_1",
});
const sub = (params: Record<string, unknown> = {}) => ({
  params,
  subscriptionId: "sub_1",
  callbackUrl: CALLBACK,
  hostUrl: "",
});

test("any-event has an events param, output and sample, and no poll", () => {
  assertEquals(anyEvent.params!.map((p) => p.key), ["events"]);
  assert(anyEvent.output!.length > 0);
  assert(anyEvent.sample !== undefined);
  assertEquals(anyEvent.poll, undefined);
});

test("with no events chosen, all three Flodesk events are registered and delivered", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_9" } }]);
  assertEquals(await anyEvent.onSubscribe!(sub(), ctx), { webhookId: "wh_9" });
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "w6w-sub_1",
    post_url: CALLBACK,
    events: ["subscriber.created", "subscriber.unsubscribed", "subscriber.added_to_segment"],
  });
  for (
    const e of ["subscriber.created", "subscriber.unsubscribed", "subscriber.added_to_segment"]
  ) {
    const out = evs(await anyEvent.handleIngest!(call(e), mockCtx().ctx)) as Array<
      Record<string, unknown>
    >;
    assertEquals(out.length, 1);
    assertEquals(out[0].eventName, e);
  }
});

test("the events filter is the registered list and also filters deliveries", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh_9" } }]);
  await anyEvent.onSubscribe!(
    sub({ events: " Subscriber.Created , subscriber.unsubscribed " }),
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).events, [
    "subscriber.created",
    "subscriber.unsubscribed",
  ]);
  const params = { events: "subscriber.created" };
  assertEquals(
    evs(await anyEvent.handleIngest!(call("subscriber.created", params), mockCtx().ctx)).length,
    1,
  );
  assertEquals(
    evs(await anyEvent.handleIngest!(call("subscriber.unsubscribed", params), mockCtx().ctx)),
    [],
  );
});

test("an unknown event name is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => anyEvent.onSubscribe!(sub({ events: "subscriber.deleted" }), ctx),
    Error,
    "Unknown Flodesk event",
  );
  assertEquals(calls.length, 0);
});

test("onUnsubscribe deletes the webhook", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await anyEvent.onUnsubscribe!(
    { params: {}, state: { webhookId: "wh_9" }, subscriptionId: "s" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/webhooks/wh_9");
});
