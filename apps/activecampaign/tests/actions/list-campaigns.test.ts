import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/list-campaigns.ts";

test("list-campaigns: GETs /campaigns, optionally filtered by automation", async () => {
  const body = { campaigns: [], meta: { total: "0" } };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute({ limit: 10, offset: 0, automationId: "5" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/3/campaigns");
  assertEquals(url.searchParams.get("filters[seriesid]"), "5");
  assertEquals(result, body);
});
