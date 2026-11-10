import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-audit-event.ts";

const params = {};
const A = { id: "evt-a", occurred_at: "2026-11-09T11:00:00Z" };
const B = { id: "evt-b", occurred_at: "2026-11-09T12:02:00Z" };
const ctxFor = (items: unknown[]) => {
  const r = [{ body: { events: items, hasMore: false } }];
  return mockCtx(r);
};
const poll = (state: unknown, items: unknown[]) => {
  const c = ctxFor(items);
  return trigger.poll!({ params, state, subscriptionId: "s" }, c.ctx).then((result) => ({
    result,
    calls: c.calls,
  }));
};
const T0 = Date.parse("2026-11-09T12:00:00Z");
const seedState = async () => {
  clock.now = () => T0;
  return (await poll({}, [A])).result.nextState;
};

test("new-audit-event seeds the first check without emitting", async () => {
  clock.now = () => T0;
  const { result } = await poll({}, [B, A]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-audit-event emits exactly the new item from the seeded state", async () => {
  const state = await seedState();
  clock.now = () => T0 + 300_000;
  const { result } = await poll(state, [B, A]);
  assertEquals(result.events, [B]);
});

test("new-audit-event returns identical results when a check is retried with the same state and responses", async () => {
  const state = await seedState();
  clock.now = () => T0 + 300_000;
  const first = await poll(state, [B, A]);
  clock.now = () => T0 + 300_000;
  const second = await poll(state, [B, A]);
  assertEquals(second.result, first.result);
  assertEquals(
    second.calls.map((c) => [c.method, c.url, c.body]),
    first.calls.map((c) => [c.method, c.url, c.body]),
  );
});

test("new-audit-event requests the window since the last check minus 10 minutes, 30 per page", async () => {
  const state = await seedState();
  clock.now = () => T0 + 300_000;
  const { calls } = await poll(state, [A]);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://public-api.granola.ai/v1/audit?occurred_after=2026-11-09T11%3A50%3A00.000Z&page_size=30",
  );
});
