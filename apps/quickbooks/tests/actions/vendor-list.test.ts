import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/vendor-list.ts";

test("vendor-list: SELECTs from Vendor", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { QueryResponse: {} } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "SELECT * FROM Vendor STARTPOSITION 1 MAXRESULTS 100");
});
