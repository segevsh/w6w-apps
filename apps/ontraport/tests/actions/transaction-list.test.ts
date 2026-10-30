import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import transactionList from "../../actions/transaction-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("transaction-list: calls GET /1/Transactions", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1", total: "400.00" }]) }]);
  const out = await transactionList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/1/Transactions");
  assertEquals(out.items.length, 1);
});
