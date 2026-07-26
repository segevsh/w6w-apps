import { assertEquals } from "@std/assert";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

Deno.test("search: GETs /search with the SOSL in `q`", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { searchRecords: [] } }]);
  await action.execute({ sosl: "FIND {acme} IN ALL FIELDS RETURNING Account(Id)" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/services/data/v60.0/search");
  assertEquals(
    new URL(calls[0].url).searchParams.get("q"),
    "FIND {acme} IN ALL FIELDS RETURNING Account(Id)",
  );
});
