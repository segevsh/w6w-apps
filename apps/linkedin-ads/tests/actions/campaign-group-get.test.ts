import { assertEquals } from "@std/assert";
import campaignGroupGet from "../../actions/campaign-group-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-group-get: fetches by account + bare campaign group id", async () => {
  const body = { id: 512358882, name: "New Campaign Group", status: "ACTIVE" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await campaignGroupGet.execute(
    { accountId: "512352200", campaignGroupId: "512358882" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/512352200/adCampaignGroups/512358882");
  assertEquals(result, body);
});

Deno.test("campaign-group-get: strips URN forms on both ids", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await campaignGroupGet.execute(
    {
      accountId: "urn:li:sponsoredAccount:1",
      campaignGroupId: "urn:li:sponsoredCampaignGroup:2",
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/1/adCampaignGroups/2");
});
