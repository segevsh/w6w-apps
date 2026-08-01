import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/bank-transaction-get.ts";

Deno.test("bank-transaction-get: GETs /BankTransactions/{id}", async () => {
  const { ctx, calls } = mockXeroCtx([{
    body: { BankTransactions: [{ BankTransactionID: "b1" }] },
  }]);
  await action.execute({ bankTransactionId: "b1" }, ctx);
  assertEquals(calls[0].url, "https://api.xero.com/api.xro/2.0/BankTransactions/b1");
});
