import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/bank-transaction-list.ts";

test("bank-transaction-list: GETs /bank_transactions with bankAccountId as a full resource URL", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { bank_transactions: [] } }]);
  await action.execute({ bankAccountId: "1", view: "unexplained" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bank_transactions");
  assertEquals(
    url.searchParams.get("bank_account"),
    "https://api.freeagent.com/v2/bank_accounts/1",
  );
  assertEquals(url.searchParams.get("view"), "unexplained");
});
