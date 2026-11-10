import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-work-order.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const wo = (id: number, updatedAt: string) => ({ id, updatedAt });
const ctx = (rows: unknown[]) => mockCtx([{ body: { workOrders: rows, nextCursor: null } }]);

test("new-or-updated-work-order: seeds, emits new, retries idempotently, sorts newest-updated first", async () => {
  const seed = ctx([wo(1, "t1")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const request = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: request.pathname,
    query: Object.fromEntries(request.searchParams),
  }, { method: "GET", path: "/v1/workorders", query: { sort: "-updatedAt", limit: "100" } });
  const page = [wo(2, "t5"), wo(1, "t1")];
  const later = { ...input, state: seeded.nextState };
  const first = await trigger.poll!(later, ctx(page).ctx);
  const retry = await trigger.poll!(later, ctx(page).ctx);
  assertEquals(first.events, [wo(2, "t5")]);
  assertEquals(retry, first);
});

test("new-or-updated-work-order: an edited work order (same id, newer updatedAt) is emitted", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([wo(1, "t1")]).ctx);
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([wo(1, "t2")]).ctx,
  );
  assertEquals(edited.events, [wo(1, "t2")]);
  const same = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([wo(1, "t1")]).ctx,
  );
  assertEquals(same.events, []);
});
