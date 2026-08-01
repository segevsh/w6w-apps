import { assertEquals } from "@std/assert";
import { mockServiceNowCtx } from "../_helpers.ts";
import action from "../../actions/table-record-get-many.ts";

Deno.test("table-record-get-many: GETs /table/{table} with query and pagination", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: [] } }]);
  await action.execute({ table: "problem", query: "active=true", limit: 10, offset: 0 }, ctx);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/now/table/problem");
  assertEquals(url.searchParams.get("sysparm_query"), "active=true");
  assertEquals(url.searchParams.get("sysparm_limit"), "10");
});
