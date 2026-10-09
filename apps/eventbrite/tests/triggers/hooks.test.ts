import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import type { HookContext, TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import orderPlaced from "../../triggers/order-placed.ts";
import ticketClassDeleted from "../../triggers/ticket-class-deleted.ts";
import activity from "../../triggers/activity.ts";
import { type NormalizedEvent, type TriggerState, WEBHOOK_ACTIONS } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";

function subscribe(
  trigger: typeof orderPlaced,
  params: Record<string, unknown>,
  ctx: HookContext,
) {
  return trigger.onSubscribe!(
    { params, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  ) as Promise<TriggerState>;
}

function delivery(body: unknown, method = "POST"): TriggerCall {
  return { method, path: "/triggers/webhooks/sub_abc", query: {}, headers: {}, body };
}

function ingest(trigger: typeof orderPlaced, call: TriggerCall, state: Partial<TriggerState>) {
  return trigger.handleIngest!(
    { raw: call, params: {}, state: state as TriggerState, subscriptionId: "sub_abc" },
    mockCtx().ctx,
  );
}

const STATE: TriggerState = {
  webhookId: "2006536",
  organizationId: "389957889113",
  actions: ["order.placed"],
  eventId: null,
};

const ORDER_DELIVERY = {
  config: {
    action: "order.placed",
    user_id: "308733706151",
    endpoint_url: CALLBACK,
    webhook_id: "2006536",
  },
  api_url: "https://www.eventbriteapi.com/v3/orders/1234567890/",
};

// ── declaration ─────────────────────────────────────────────────────────────

Deno.test("app: one trigger per Eventbrite webhook action, plus activity", () => {
  const keys = app.triggers.map((t) => t.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys.length, WEBHOOK_ACTIONS.length + 1);
  assertEquals(keys.includes("activity"), true);
  for (const t of app.triggers) {
    // The webhook form: whatever is registered must be destroyable.
    assertEquals(typeof t.onSubscribe, "function", t.key);
    assertEquals(typeof t.onUnsubscribe, "function", t.key);
    assertEquals(typeof t.handleIngest, "function", t.key);
    assertEquals(t.poll, undefined, t.key);
  }
});

Deno.test("app: only activity asks which actions to watch", () => {
  for (const t of app.triggers) {
    const keys = (t.params ?? []).map((p) => p.key);
    assertEquals(keys.includes("actions"), t.key === "activity", t.key);
    assertEquals(keys.includes("organizationId"), true, t.key);
    assertEquals(keys.includes("eventId"), true, t.key);
  }
});

// ── onSubscribe ─────────────────────────────────────────────────────────────

Deno.test("onSubscribe: registers a webhook for the trigger's action on the callback URL", async () => {
  const { ctx, calls } = mockCtx([
    { body: { webhooks: [], pagination: { has_more_items: false } } },
    { body: { id: "2006536", actions: ["order.placed"] } },
  ]);
  const state = await subscribe(orderPlaced, { organizationId: "389957889113" }, ctx);

  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/organizations/389957889113/webhooks/");
  assertEquals(calls[1].method, "POST");
  assertEquals(new URL(calls[1].url).pathname, "/v3/organizations/389957889113/webhooks/");
  assertEquals(JSON.parse(calls[1].body!), { endpoint_url: CALLBACK, actions: "order.placed" });
  assertEquals(state, STATE);
});

Deno.test("onSubscribe: an event id limits the webhook to that event", async () => {
  const { ctx, calls } = mockCtx([
    { body: { webhooks: [] } },
    { body: { id: "9" } },
  ]);
  const state = await subscribe(orderPlaced, { organizationId: "1", eventId: " 555 " }, ctx);
  assertEquals(JSON.parse(calls[1].body!).event_id, "555");
  assertEquals(state.eventId, "555");
});

Deno.test("onSubscribe: a blank organization resolves to the account's only one", async () => {
  const { ctx, calls } = mockCtx([
    { body: { organizations: [{ id: "777", name: "Org" }] } },
    { body: { webhooks: [] } },
    { body: { id: "9" } },
  ]);
  const state = await subscribe(orderPlaced, { organizationId: "  " }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/users/me/organizations/");
  assertEquals(new URL(calls[2].url).pathname, "/v3/organizations/777/webhooks/");
  assertEquals(state.organizationId, "777");
});

Deno.test("onSubscribe: several organizations and none chosen is refused, naming them", async () => {
  const { ctx, calls } = mockCtx([
    { body: { organizations: [{ id: "1" }, { id: "2" }] } },
  ]);
  const err = await assertRejects(() => subscribe(orderPlaced, {}, ctx), Error);
  assertEquals(err.message.includes("1, 2"), true);
  assertEquals(calls.length, 1); // nothing registered
});

Deno.test("onSubscribe: deletes a leftover webhook on the same callback URL, keeps others", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        webhooks: [
          { id: "11", endpoint_url: CALLBACK },
          { id: "12", endpoint_url: "https://elsewhere.example/hook" },
        ],
        pagination: { has_more_items: true, continuation: "c2" },
      },
    },
    { body: { webhooks: [{ id: "13", endpoint_url: CALLBACK }], pagination: {} } },
    { body: {} }, // DELETE 11
    { status: 404, body: { error: "NOT_FOUND" } }, // DELETE 13: already gone is fine
    { body: { id: "14" } },
  ]);
  const state = await subscribe(orderPlaced, { organizationId: "1" }, ctx);

  assertEquals(new URL(calls[1].url).searchParams.get("continuation"), "c2");
  assertEquals(
    calls.filter((c) => c.method === "DELETE").map((c) => new URL(c.url).pathname),
    ["/v3/webhooks/11/", "/v3/webhooks/13/"],
  );
  assertEquals(calls[4].method, "POST");
  assertEquals(state.webhookId, "14");
});

Deno.test("onSubscribe: a vendor failure rejects, so the host records the subscription failed", async () => {
  const { ctx } = mockCtx([
    { body: { webhooks: [] } },
    { status: 403, statusText: "Forbidden", body: { error: "NOT_AUTHORIZED" } },
  ]);
  await assertRejects(() => subscribe(orderPlaced, { organizationId: "1" }, ctx), Error, "403");
});

Deno.test("onSubscribe: a create response without an id is refused", async () => {
  const { ctx } = mockCtx([{ body: { webhooks: [] } }, { body: {} }]);
  await assertRejects(
    () => subscribe(orderPlaced, { organizationId: "1" }, ctx),
    Error,
    "returned no id",
  );
});

Deno.test("onSubscribe (activity): registers the chosen actions, deduplicated", async () => {
  const { ctx, calls } = mockCtx([{ body: { webhooks: [] } }, { body: { id: "5" } }]);
  const state = await subscribe(activity, {
    organizationId: "1",
    actions: ["order.placed", "attendee.checked_in", "order.placed"],
  }, ctx);
  assertEquals(JSON.parse(calls[1].body!).actions, "order.placed,attendee.checked_in");
  assertEquals(state.actions, ["order.placed", "attendee.checked_in"]);
});

Deno.test("onSubscribe (activity): no actions, or an unknown one, is refused before any call", async () => {
  const empty = mockCtx();
  await assertRejects(() => subscribe(activity, { organizationId: "1" }, empty.ctx), Error);
  const unknown = mockCtx();
  await assertRejects(
    () => subscribe(activity, { organizationId: "1", actions: ["order.exploded"] }, unknown.ctx),
    Error,
    "order.exploded",
  );
  assertEquals(empty.calls.length + unknown.calls.length, 0);
});

// ── onUnsubscribe ───────────────────────────────────────────────────────────

async function unsubscribe(trigger: typeof orderPlaced, state: unknown, ctx: HookContext) {
  await trigger.onUnsubscribe!(
    { params: {}, state: state as TriggerState, subscriptionId: "sub_abc" },
    ctx,
  );
}

Deno.test("onUnsubscribe: deletes the registered webhook", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await unsubscribe(orderPlaced, STATE, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v3/webhooks/2006536/");
});

Deno.test("onUnsubscribe: a webhook already gone is success (idempotent)", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "NOT_FOUND" } }]);
  await unsubscribe(orderPlaced, STATE, ctx);
});

Deno.test("onUnsubscribe: any other failure rejects, so the host audits it", async () => {
  const { ctx } = mockCtx([{ status: 500, statusText: "Server Error", body: "boom" }]);
  await assertRejects(() => unsubscribe(orderPlaced, STATE, ctx), Error, "500");
});

Deno.test("onUnsubscribe: no webhook id in state means nothing to delete", async () => {
  const { ctx, calls } = mockCtx();
  await unsubscribe(orderPlaced, {}, ctx);
  await unsubscribe(orderPlaced, undefined, ctx);
  assertEquals(calls.length, 0);
});

// ── handleIngest ────────────────────────────────────────────────────────────

Deno.test("handleIngest: a delivery becomes one normalized event", async () => {
  const events = await ingest(orderPlaced, delivery(ORDER_DELIVERY), STATE);
  assertEquals(events, [{
    action: "order.placed",
    resourceType: "order",
    resourceId: "1234567890",
    apiUrl: "https://www.eventbriteapi.com/v3/orders/1234567890/",
    webhookId: "2006536",
    userId: "308733706151",
  }]);
});

Deno.test("handleIngest: a JSON body kept as text is parsed", async () => {
  const events = await ingest(orderPlaced, delivery(JSON.stringify(ORDER_DELIVERY)), STATE);
  assertEquals(events.length, 1);
});

Deno.test("handleIngest: a nested record's id is the last numeric segment", async () => {
  const events = await ingest(
    activity,
    delivery({
      config: { action: "attendee.checked_in", webhook_id: "2006536" },
      api_url: "https://www.eventbriteapi.com/v3/events/62541733007/attendees/2345678901/",
    }),
    { ...STATE, actions: ["attendee.checked_in"] },
  );
  assertEquals(events[0].resourceType, "attendee");
  assertEquals(events[0].resourceId, "2345678901");
});

Deno.test("handleIngest: the dashboard's test ping is acknowledged with no event", async () => {
  const ping = {
    config: { action: "test", webhook_id: "2006536", endpoint_url: CALLBACK },
    api_url: "https://www.eventbriteapi.com/{api-endpoint-to-fetch-object-details}/",
  };
  assertEquals(await ingest(orderPlaced, delivery(ping), STATE), []);
});

Deno.test("handleIngest: an action the subscription did not register is dropped", async () => {
  const body = { ...ORDER_DELIVERY, config: { ...ORDER_DELIVERY.config, action: "event.created" } };
  assertEquals(await ingest(orderPlaced, delivery(body), STATE), []);
  // activity filters on what it registered.
  assertEquals(
    await ingest(activity, delivery(body), { ...STATE, actions: ["order.refunded"] }),
    [],
  );
});

Deno.test("handleIngest: a delivery naming another webhook is refused", () => {
  const body = { ...ORDER_DELIVERY, config: { ...ORDER_DELIVERY.config, webhook_id: "999" } };
  assertThrows(() => ingest(orderPlaced, delivery(body), STATE), Error, "999");
});

Deno.test("handleIngest: an api_url off Eventbrite's API is refused", () => {
  for (
    const api_url of [
      "https://evil.example/v3/orders/1/",
      "http://www.eventbriteapi.com/v3/orders/1/",
      "https://www.eventbriteapi.com/v2/orders/1/",
      "not a url",
    ]
  ) {
    assertThrows(
      () => ingest(orderPlaced, delivery({ ...ORDER_DELIVERY, api_url }), STATE),
      Error,
      undefined,
      api_url,
    );
  }
});

Deno.test("handleIngest: something that is not a delivery, or not a POST, is refused", () => {
  assertThrows(() => ingest(orderPlaced, delivery({ hello: "world" }), STATE), Error);
  assertThrows(() => ingest(orderPlaced, delivery("<html>"), STATE), Error);
  assertThrows(() => ingest(orderPlaced, delivery(ORDER_DELIVERY, "GET"), STATE), Error, "POST");
});

// ── parseOutput ─────────────────────────────────────────────────────────────

async function parse(trigger: typeof orderPlaced, normalized: unknown, ctx: HookContext) {
  return await trigger.parseOutput!(
    {
      call: delivery(ORDER_DELIVERY),
      normalized: normalized as NormalizedEvent,
      subscriptionId: "sub_abc",
    },
    ctx,
  ) as Record<string, unknown>;
}

const [ORDER_EVENT] = ingest(orderPlaced, delivery(ORDER_DELIVERY), STATE) as unknown[];

Deno.test("parseOutput: fetches the record the delivery points at", async () => {
  const order = { id: "1234567890", email: "alex@example.com" };
  const { ctx, calls } = mockCtx([{ body: order }]);
  const out = await parse(orderPlaced, ORDER_EVENT, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://www.eventbriteapi.com/v3/orders/1234567890/");
  assertEquals(out.resource, order);
  assertEquals(out.action, "order.placed");
  assertEquals(out.resourceId, "1234567890");
});

Deno.test("parseOutput: a record that no longer exists is null, not a failure", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "NOT_FOUND" } }]);
  assertEquals((await parse(orderPlaced, ORDER_EVENT, ctx)).resource, null);
});

Deno.test("parseOutput: a deleted ticket class is not fetched", async () => {
  const { ctx, calls } = mockCtx();
  const out = await parse(ticketClassDeleted, {
    action: "ticket_class.deleted",
    resourceType: "ticket_class",
    resourceId: "3",
    apiUrl: "https://www.eventbriteapi.com/v3/events/1/ticket_classes/3/",
    webhookId: "2006536",
    userId: null,
  }, ctx);
  assertEquals(calls.length, 0);
  assertEquals(out.resource, null);
});

Deno.test("parseOutput: an outage rejects, so the dispatcher retries", async () => {
  const { ctx } = mockCtx([{ status: 503, statusText: "Unavailable", body: "down" }]);
  await assertRejects(() => parse(orderPlaced, ORDER_EVENT, ctx), Error, "503");
});

Deno.test("parseOutput: a stored raw body (parser not run) is normalized first", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1234567890" } }]);
  const out = await parse(orderPlaced, ORDER_DELIVERY, ctx);
  assertEquals(calls[0].url, ORDER_DELIVERY.api_url);
  assertEquals(out.resourceId, "1234567890");
});
