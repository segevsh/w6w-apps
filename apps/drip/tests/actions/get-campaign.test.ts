import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/get-campaign.ts";

test("get-campaign: GETs /campaigns/:campaignId", async () => {
  const { ctx, calls } = mockDripCtx([{
    body: { campaigns: [{ id: "123456", name: "SEO Email Course", status: "active" }] },
  }]);
  const out = await action.execute({ campaignId: "123456" }, ctx);
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/1234567/campaigns/123456");
  assertEquals(out, { id: "123456", name: "SEO Email Course", status: "active" });
});

test("get-campaign: defaults to an empty object when Drip returns none", async () => {
  const { ctx } = mockDripCtx([{ body: {} }]);
  assertEquals(await action.execute({ campaignId: "123456" }, ctx), {});
});
