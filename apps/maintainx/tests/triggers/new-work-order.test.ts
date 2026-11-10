import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-work-order.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const wo = (id: number) => ({ id, updatedAt: "t1" });
const ctx = (ids: number[]) => mockCtx([{ body: { workOrders: ids.map(wo), nextCursor: null } }]);

test("new-work-order: seeds, emits only new items, retries idempotently, sorts newest-created first", async () => {
  const seed = ctx([1]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const request = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: request.pathname,
    query: Object.fromEntries(request.searchParams),
  }, { method: "GET", path: "/v1/workorders", query: { sort: "-createdAt", limit: "100" } });
  const later = { ...input, state: seeded.nextState };
  const first = await trigger.poll!(later, ctx([2, 1]).ctx);
  const retry = await trigger.poll!(later, ctx([2, 1]).ctx);
  assertEquals(first.events, [wo(2)]);
  assertEquals(retry, first);
});
