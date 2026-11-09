import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-invoice.ts";
import { mockNinjaCtx } from "../_helpers.ts";

const response = (data: unknown[]) => ({ body: { data } });

test("new-invoice: seeds, emits unseen invoices, retries idempotently, and calls the list action", async () => {
  const seed = await trigger.poll!(
    { params: {}, state: {}, subscriptionId: "sub" },
    mockNinjaCtx([response([{ id: "old" }])]).ctx,
  );
  assertEquals(seed.events, []);
  assertEquals(seed.nextState?.seeded, true);
  const invoices = [{ id: "new", number: "INV-1" }, { id: "old" }];
  const freshMock = mockNinjaCtx([response(invoices)]);
  const fresh = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    freshMock.ctx,
  );
  assertEquals(fresh.events, [invoices[0]]);
  const retryA = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    mockNinjaCtx([response(invoices)]).ctx,
  );
  const retryB = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    mockNinjaCtx([response(invoices)]).ctx,
  );
  assertEquals(retryA, retryB);
  const request = new URL(freshMock.calls[0].url);
  assertEquals([freshMock.calls[0].method, request.pathname, request.search], [
    "GET",
    "/api/v1/invoices",
    "?sort=created_at%7Cdesc&page=1&per_page=100",
  ]);
});
