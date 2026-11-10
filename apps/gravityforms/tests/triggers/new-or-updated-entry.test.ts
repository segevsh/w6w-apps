import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-entry.ts";

const params = {};
const A = { id: 1, date_updated: "2026-11-09 00:00:00" };
const B = { id: 2, date_updated: "2026-11-09 01:00:00" };
const ctxFor = (items: unknown[]) => {
  const r = [{ body: { entries: items } }];
  return mockCtx(r, { display: DISPLAY });
};
const poll = (state: unknown, items: unknown[]) => {
  const c = ctxFor(items);
  return trigger.poll!({ params, state, subscriptionId: "s" }, c.ctx).then((result) => ({
    result,
    calls: c.calls,
  }));
};
const seedState = async () => (await poll({}, [A])).result.nextState;

test("new-or-updated-entry seeds the first check without emitting", async () => {
  const { result } = await poll({}, [B, A]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-entry emits exactly the new item from the seeded state", async () => {
  const state = await seedState();
  const { result } = await poll(state, [B, A]);
  assertEquals(result.events, [B]);
});

test("new-or-updated-entry returns identical results when a check is retried with the same state and responses", async () => {
  const state = await seedState();
  const first = await poll(state, [B, A]);
  const second = await poll(state, [B, A]);
  assertEquals(second.result, first.result);
  assertEquals(
    second.calls.map((c) => [c.method, c.url, c.body]),
    first.calls.map((c) => [c.method, c.url, c.body]),
  );
});

test("new-or-updated-entry emits an edited item again because the update stamp is in its id", async () => {
  const state = await seedState();
  const edited = { ...A, date_updated: "2026-11-10 00:00:00" };
  const { result } = await poll(state, [edited]);
  assertEquals(result.events, [edited]);
});

test("new-or-updated-entry requests updated-time descending", async () => {
  const state = await seedState();
  const { calls } = await poll(state, [A]);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://example.com/wp-json/gf/v2/entries?sorting%5Bkey%5D=date_updated&sorting%5Bdirection%5D=DESC&paging%5Bpage_size%5D=100",
  );
});
