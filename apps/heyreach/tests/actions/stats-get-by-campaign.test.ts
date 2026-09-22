import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/stats-get-by-campaign.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/stats/GetOverallStatsByCampaign";
const window = {
  startDate: "2026-09-01T00:00:00.000Z",
  endDate: "2026-09-22T23:59:59.999Z",
};

Deno.test("stats-get-by-campaign: the same body as the overall stats call", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ accountIds: [1234], campaignIds: [], ...window }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { accountIds: [1234], campaignIds: [], ...window });
});

/** Per-campaign rows carry `isCampaignDeleted`, which the aggregate call cannot. */
Deno.test("stats-get-by-campaign: per-campaign rows are returned as a list", async () => {
  const overallStats = [{ campaignId: 5, campaignName: "Q3", isCampaignDeleted: true }];
  const { ctx } = mockCtx([{ status: 200, body: { byDayStats: {}, overallStats } }]);
  const result = await action.execute!({ ...window }, ctx) as { overallStats: unknown[] };
  assertEquals(result.overallStats, overallStats);
});
