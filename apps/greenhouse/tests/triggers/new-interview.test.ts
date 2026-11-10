import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listPage, mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-interview.ts";

const params = {};
const A = { id: 1 };
const B = { id: 2 };
const ctxFor = (items: unknown[]) => {
  const r = [listPage(items)];
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

test("new-interview seeds the first check without emitting", async () => {
  clock.now = () => T0;
  const { result } = await poll({}, [B, A]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-interview emits exactly the new item from the seeded state", async () => {
  const state = await seedState();
  clock.now = () => T0 + 300_000;
  const { result } = await poll(state, [B, A]);
  assertEquals(result.events, [B]);
});

test("new-interview returns identical results when a check is retried with the same state and responses", async () => {
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

test("new-interview requests interviews created since the last check minus 2 minutes", async () => {
  const state = await seedState();
  clock.now = () => T0 + 300_000;
  const { calls } = await poll(state, [A]);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://harvest.greenhouse.io/v3/interviews?per_page=100&created_at=gte%7C2026-11-09T11%3A58%3A00.000Z",
  );
});
