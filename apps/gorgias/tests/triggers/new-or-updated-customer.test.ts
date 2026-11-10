import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockGorgiasCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-customer.ts";

const params = {};
const A = { id: 1, updated_datetime: "2026-11-09T00:00:00Z" };
const B = { id: 2, updated_datetime: "2026-11-09T01:00:00Z" };
const ctxFor = (items: unknown[]) => {
  const r = [{ body: { data: items } }];
  return mockGorgiasCtx(r);
};
const poll = (state: unknown, items: unknown[]) => {
  const c = ctxFor(items);
  return trigger.poll!({ params, state, subscriptionId: "s" }, c.ctx).then((result) => ({
    result,
    calls: c.calls,
  }));
};
const seedState = async () => (await poll({}, [A])).result.nextState;

test("new-or-updated-customer seeds the first check without emitting", async () => {
  const { result } = await poll({}, [B, A]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-customer emits exactly the new item from the seeded state", async () => {
  const state = await seedState();
  const { result } = await poll(state, [B, A]);
  assertEquals(result.events, [B]);
});

test("new-or-updated-customer returns identical results when a check is retried with the same state and responses", async () => {
  const state = await seedState();
  const first = await poll(state, [B, A]);
  const second = await poll(state, [B, A]);
  assertEquals(second.result, first.result);
  assertEquals(
    second.calls.map((c) => [c.method, c.url, c.body]),
    first.calls.map((c) => [c.method, c.url, c.body]),
  );
});

test("new-or-updated-customer emits an edited item again because the update stamp is in its id", async () => {
  const state = await seedState();
  const edited = { ...A, updated_datetime: "2026-11-10T00:00:00Z" };
  const { result } = await poll(state, [edited]);
  assertEquals(result.events, [edited]);
});

test("new-or-updated-customer requests updated-time descending", async () => {
  const state = await seedState();
  const { calls } = await poll(state, [A]);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.gorgias.com/api/customers?order_by=updated_datetime%3Adesc&limit=100",
  );
});
