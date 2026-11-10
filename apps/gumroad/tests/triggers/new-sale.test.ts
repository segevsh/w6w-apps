import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-sale.ts";
import { mockCtx } from "../_helpers.ts";

const response = (sales: unknown[]) => ({ body: { success: true, sales } });

test("new-sale: seeds, emits unseen sales, retries idempotently, and calls the newest-first list", async () => {
  const seed = await trigger.poll!(
    { params: {}, state: {}, subscriptionId: "sub" },
    mockCtx([response([{ id: "old" }])]).ctx,
  );
  assertEquals(seed.events, []);
  assertEquals(seed.nextState?.seeded, true);
  const sales = [{ id: "new", email: "buyer@example.test" }, { id: "old" }];
  const freshMock = mockCtx([response(sales)]);
  const fresh = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    freshMock.ctx,
  );
  assertEquals(fresh.events, [sales[0]]);
  const retryA = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    mockCtx([response(sales)]).ctx,
  );
  const retryB = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    mockCtx([response(sales)]).ctx,
  );
  assertEquals(retryA, retryB);
  assertEquals([
    freshMock.calls[0].method,
    new URL(freshMock.calls[0].url).pathname,
    new URL(freshMock.calls[0].url).search,
  ], ["GET", "/v2/sales", ""]);
});
