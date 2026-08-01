import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/get-campaign.ts";

Deno.test("get-campaign: GETs /campaigns/{id}", async () => {
  const body = { campaign: { id: "11", name: "Spring Sale" } };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute({ campaignId: "11" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/3/campaigns/11");
  assertEquals(result, body);
});
