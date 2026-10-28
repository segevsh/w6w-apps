import { assertEquals } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-get: fetches by account + bare campaign id", async () => {
  const body = { id: 141049524, name: "Campaign Sponsored update B", status: "ACTIVE" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await campaignGet.execute(
    { accountId: "506289162", campaignId: "141049524" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/506289162/adCampaigns/141049524");
  assertEquals(result, body);
});
