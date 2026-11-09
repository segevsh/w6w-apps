import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";

const params = { eventType: "subscription_created" };
const event1 = { id: "ev_1", event_type: "subscription_created", occurred_at: 1762689600 };
const event2 = { id: "ev_2", event_type: "subscription_created", occurred_at: 1762693200 };

test("new-event: seeds without emitting existing events", async () => {
  const { ctx } = mockCtx([{ body: { list: [{ event: event1 }] } }]);
  const result = await trigger.poll!({ params, state: {} }, connected(ctx));
  assertEquals(result.events, []);
  assertEquals(result.nextState.seeded, true);
});

test("new-event: emits an event that arrives after the seed", async () => {
  const { ctx } = mockCtx([
    { body: { list: [{ event: event1 }] } },
    { body: { list: [{ event: event2 }, { event: event1 }] } },
  ]);
  const connectedCtx = connected(ctx);
  const seed = await trigger.poll!({ params, state: {} }, connectedCtx);
  const result = await trigger.poll!({ params, state: seed.nextState }, connectedCtx);
  assertEquals(result.events, [event2]);
});

test("new-event: is idempotent for the same state and response", async () => {
  const state = { v: 1, kind: "ids", seeded: true, ids: [event1.id] };
  const a = mockCtx([{ body: { list: [{ event: event2 }, { event: event1 }] } }]);
  const b = mockCtx([{ body: { list: [{ event: event2 }, { event: event1 }] } }]);
  assertEquals(
    await trigger.poll!({ params, state }, connected(a.ctx)),
    await trigger.poll!({ params, state }, connected(b.ctx)),
  );
});

test("new-event: calls list events with literal newest-first sort", async () => {
  const { ctx, calls } = mockCtx([{ body: { list: [] } }]);
  await trigger.poll!({ params, state: {} }, connected(ctx));
  assertEquals(
    { method: calls[0].method, url: calls[0].url },
    {
      method: "GET",
      url:
        "https://acme.chargebee.com/api/v2/events?limit=100&event_type%5Bis%5D=subscription_created&sort_by%5Bdesc%5D=occurred_at",
    },
  );
});
