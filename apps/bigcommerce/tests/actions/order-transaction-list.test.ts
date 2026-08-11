import { assert, assertEquals } from "@std/assert";
import orderTransactionList from "../../actions/order-transaction-list.ts";
import orderGet from "../../actions/order-get.ts";
import { mockCtx, pathOf, v3Page } from "../_helpers.ts";

Deno.test("order-transaction-list: is the one order route that lives at v3", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ id: 1, event: "purchase" }]) }]);
  const out = await orderTransactionList.execute({ orderId: 100 }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/orders/100/transactions");
  assertEquals(out.data, [{ id: 1, event: "purchase" }]);
});

Deno.test("order-transaction-list: one order, two API versions, on purpose", async () => {
  // Order CRUD is v2-only; transactions and refunds are v3-only. Both are current.
  const transactions = mockCtx([{ body: v3Page([]) }]);
  await orderTransactionList.execute({ orderId: 5 }, transactions.ctx);
  const read = mockCtx([{ body: {} }]);
  await orderGet.execute({ orderId: 5 }, read.ctx);

  assert(pathOf(transactions.calls[0].url).includes("/v3/orders/5"));
  assert(pathOf(read.calls[0].url).includes("/v2/orders/5"));
});
