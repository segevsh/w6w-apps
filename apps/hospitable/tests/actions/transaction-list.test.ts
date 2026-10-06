import { assertEquals } from "@std/assert";
import transactionList from "../../actions/transaction-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transaction-list: GET /v2/transactions with include and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await transactionList.execute({ include: "payout", page: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/transactions");
  assertEquals(queryOf(calls[0].url), { include: "payout", page: "1" });
});
