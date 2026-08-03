import { assert, assertEquals } from "@std/assert";
import getCampaign from "../../actions/get-campaign.ts";
import { mockCtx, params } from "../_helpers.ts";

Deno.test("get-campaign: GETs /campaigns/{id} with no trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "cam_1" } }]);
  await getCampaign.execute!({ campaignId: "cam_bSn8EORHQxbWPjHvu" }, ctx);
  assertEquals(calls[0].url, "https://api.lemlist.com/api/campaigns/cam_bSn8EORHQxbWPjHvu");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-campaign: percent-encodes the id rather than splicing it raw", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await getCampaign.execute!({ campaignId: "cam_a/b?c" }, ctx);
  assert(calls[0].url.endsWith("/campaigns/cam_a%2Fb%3Fc"));
});

Deno.test("get-campaign: is a read action requiring only the campaign id", () => {
  assertEquals(getCampaign.type, "read");
  assertEquals(params(getCampaign).filter((p) => p.required).map((p) => p.key), ["campaignId"]);
});
