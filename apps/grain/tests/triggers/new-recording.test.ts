import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-recording.ts";

const params = {};
const A = { id: "rec-a", start_datetime: "2026-11-09T11:00:00Z" };
const B = { id: "rec-b", start_datetime: "2026-11-09T12:02:00Z" };
const ctxFor = (items: unknown[]) => {
  const r = [{ body: { recordings: items, cursor: null } }];
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

test("new-recording seeds the first check without emitting", async () => {
  clock.now = () => T0;
  const { result } = await poll({}, [B, A]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-recording emits exactly the new item from the seeded state", async () => {
  const state = await seedState();
  clock.now = () => T0 + 300_000;
  const { result } = await poll(state, [B, A]);
  assertEquals(result.events, [B]);
});

test("new-recording returns identical results when a check is retried with the same state and responses", async () => {
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

test("new-recording requests recordings after the last check minus 24 hours", async () => {
  const state = await seedState();
  clock.now = () => T0 + 300_000;
  const { calls } = await poll(state, [A]);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.grain.com/_/public-api/v2/recordings");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    filter: { after_datetime: "2026-11-08T12:00:00.000Z" },
  });
});
