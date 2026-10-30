import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

test("search: GETs /search with the SOSL in `q`", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { searchRecords: [] } }]);
  await action.execute({ sosl: "FIND {acme} IN ALL FIELDS RETURNING Account(Id)" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/services/data/v60.0/search");
  assertEquals(
    new URL(calls[0].url).searchParams.get("q"),
    "FIND {acme} IN ALL FIELDS RETURNING Account(Id)",
  );
});
