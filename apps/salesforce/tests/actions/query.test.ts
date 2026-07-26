import { assertEquals } from "@std/assert";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/query.ts";

Deno.test("query: GETs /query with the SOQL in `q`", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { totalSize: 0, records: [] } }]);
  await action.execute({ soql: "SELECT Id FROM Contact" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/services/data/v60.0/query");
  assertEquals(new URL(calls[0].url).searchParams.get("q"), "SELECT Id FROM Contact");
});

Deno.test("query: includeDeleted switches to the queryAll endpoint", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: {} }]);
  await action.execute({ soql: "SELECT Id FROM Contact", includeDeleted: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/services/data/v60.0/queryAll");
});
