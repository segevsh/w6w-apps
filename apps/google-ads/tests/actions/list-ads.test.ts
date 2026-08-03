import { assert, assertEquals, assertThrows } from "@std/assert";
import { bodyOf, mockAdsCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/list-ads.ts";

const OK = { status: 200, body: { results: [] } };

Deno.test("list-ads: queries FROM ad_group_ad — `ad` is not a FROM target", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("FROM ad_group_ad"));
  assert(!/FROM ad\b(?!_group)/.test(q));
});

Deno.test("list-ads: selects the ad under ad_group_ad.ad.* plus the policy verdict", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  for (
    const f of [
      "ad_group_ad.ad.id",
      "ad_group_ad.ad.type",
      "ad_group_ad.ad.final_urls",
      "ad_group_ad.policy_summary.approval_status",
      "ad_group_ad.status",
    ]
  ) assert(q.includes(f), `missing ${f}`);
});

Deno.test("list-ads: narrows by ad group and campaign", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ adGroupId: "5", campaignId: "42" }, ctx);
  assert(queryOf(calls[0]).includes("WHERE ad_group.id = 5 AND campaign.id = 42"));
});

Deno.test("list-ads: filters on ad_group_ad.status, not ad.status", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ status: "paused" }, ctx);
  assert(queryOf(calls[0]).includes("WHERE ad_group_ad.status = PAUSED"));
});

Deno.test("list-ads: refuses a non-numeric ad group id", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(() => action.execute({ adGroupId: "5;DROP" }, ctx), Error, "numeric ID");
});

Deno.test("list-ads: forwards the page token", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ pageToken: "tok" }, ctx);
  assertEquals(bodyOf(calls[0]).pageToken, "tok");
});
