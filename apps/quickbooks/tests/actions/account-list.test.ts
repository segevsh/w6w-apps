import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/account-list.ts";

test("account-list: SELECTs from Account", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { QueryResponse: {} } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "SELECT * FROM Account STARTPOSITION 1 MAXRESULTS 100");
});
