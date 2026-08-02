import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/vendor-list.ts";

Deno.test("vendor-list: SELECTs from Vendor", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { QueryResponse: {} } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "SELECT * FROM Vendor STARTPOSITION 1 MAXRESULTS 100");
});
