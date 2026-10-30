import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/bank-transaction-get.ts";

test("bank-transaction-get: GETs /bank_transactions/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { bank_transaction: { url: "x" } } }]);
  await action.execute({ bankTransactionId: "8" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bank_transactions/8");
});
