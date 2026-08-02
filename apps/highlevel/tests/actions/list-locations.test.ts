import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/list-locations.ts";

Deno.test("list-locations: GETs /locations/search with the given filters", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { locations: [] } }]);
  await action.execute!({ companyId: "co-1", limit: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/locations/search");
  assertEquals(url.searchParams.get("companyId"), "co-1");
  assertEquals(url.searchParams.get("limit"), "5");
});
