import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/list-deals.ts";

Deno.test("list-deals: GETs /deals with filters[...] query params", async () => {
  const body = { deals: [], meta: { total: 0 } };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute(
    { limit: 25, offset: 0, search: "acme", stage: "3", group: "1", status: 0 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/3/deals");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("filters[search]"), "acme");
  assertEquals(url.searchParams.get("filters[stage]"), "3");
  assertEquals(url.searchParams.get("filters[group]"), "1");
  assertEquals(url.searchParams.get("filters[status]"), "0");
  assertEquals(result, body);
});
