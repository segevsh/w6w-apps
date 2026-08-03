import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockAdsCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/get-campaign.ts";

const OK = { status: 200, body: { results: [{ campaign: { id: "42" } }] } };

Deno.test("get-campaign: reads one campaign by id predicate — there is no campaigns.get", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ campaignId: "42" }, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("FROM campaign WHERE campaign.id = 42 LIMIT 1"));
  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers/1234567890/googleAds:search",
  );
});

Deno.test("get-campaign: refuses a non-numeric campaign id", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(
    () => action.execute({ campaignId: "42 OR 1=1" }, ctx),
    Error,
    "numeric ID",
  );
});

Deno.test("get-campaign: zero rows is an empty result, not an error", async () => {
  const { ctx } = mockAdsCtx([{ status: 200, body: { results: [] } }]);
  assertEquals(await action.execute({ campaignId: "42" }, ctx), { results: [] });
});

Deno.test("get-campaign: selects the campaign's budget and bidding configuration", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ campaignId: "42" }, ctx);
  const q = queryOf(calls[0]);
  for (
    const f of [
      "campaign.campaign_budget",
      "campaign.bidding_strategy_type",
      "campaign.serving_status",
      "campaign.optimization_score",
    ]
  ) assert(q.includes(f), `missing ${f}`);
});
