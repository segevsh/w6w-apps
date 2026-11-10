import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

const params = {};
const A = { id: "CU1" };
const B = { id: "CU2" };
const ctxFor = (items: unknown[]) => {
  const r = [{ body: listEnvelope("customers", items) }];
  return mockCtx(r);
};
const poll = (state: unknown, items: unknown[]) => {
  const c = ctxFor(items);
  return trigger.poll!({ params, state, subscriptionId: "s" }, c.ctx).then((result) => ({
    result,
    calls: c.calls,
  }));
};
const seedState = async () => (await poll({}, [A])).result.nextState;

test("new-customer seeds the first check without emitting", async () => {
  const { result } = await poll({}, [B, A]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-customer emits exactly the new item from the seeded state", async () => {
  const state = await seedState();
  const { result } = await poll(state, [B, A]);
  assertEquals(result.events, [B]);
});

test("new-customer returns identical results when a check is retried with the same state and responses", async () => {
  const state = await seedState();
  const first = await poll(state, [B, A]);
  const second = await poll(state, [B, A]);
  assertEquals(second.result, first.result);
  assertEquals(
    second.calls.map((c) => [c.method, c.url, c.body]),
    first.calls.map((c) => [c.method, c.url, c.body]),
  );
});

test("new-customer requests newest-created customers first", async () => {
  const state = await seedState();
  const { calls } = await poll(state, [A]);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.gocardless.com/customers?limit=100&sort_field=created_at&sort_direction=desc",
  );
});
