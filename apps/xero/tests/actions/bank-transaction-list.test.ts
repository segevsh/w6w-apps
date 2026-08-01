import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/bank-transaction-list.ts";

Deno.test("bank-transaction-list: GETs /BankTransactions with page defaulted to 1", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { BankTransactions: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api.xro/2.0/BankTransactions");
  assertEquals(url.searchParams.get("page"), "1");
});
