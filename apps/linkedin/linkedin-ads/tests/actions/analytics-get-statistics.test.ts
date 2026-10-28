import { assertEquals, assertRejects } from "@std/assert";
import analyticsGetStatistics from "../../actions/analytics-get-statistics.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("analytics-get-statistics: q=statistics, pivots as a List(), campaigns facet", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await analyticsGetStatistics.execute(
    {
      facetType: "campaigns",
      facetIds: "1234567",
      pivots: ["CAMPAIGN"],
      dateStart: "2024-01-01",
      timeGranularity: "DAILY",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/rest/adAnalytics");
  const q = queryOf(calls[0].url);
  assertEquals(q.q, "statistics");
  assertEquals(q.pivots, "List(CAMPAIGN)");
  assertEquals(q.campaigns, "List(urn:li:sponsoredCampaign:1234567)");
});

Deno.test("analytics-get-statistics: up to three pivots are joined in one List()", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await analyticsGetStatistics.execute(
    {
      facetType: "accounts",
      facetIds: "1",
      pivots: ["CAMPAIGN", "IMPRESSION_DEVICE_TYPE", "PLACEMENT_NAME"],
      dateStart: "2024-01-01",
      timeGranularity: "ALL",
    },
    ctx,
  );
  assertEquals(
    queryOf(calls[0].url).pivots,
    "List(CAMPAIGN,IMPRESSION_DEVICE_TYPE,PLACEMENT_NAME)",
  );
});

Deno.test("analytics-get-statistics: rejects zero or more than three pivots, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await analyticsGetStatistics.execute(
        {
          facetType: "accounts",
          facetIds: "1",
          pivots: [],
          dateStart: "2024-01-01",
          timeGranularity: "ALL",
        },
        ctx,
      ),
    Error,
    "Pivots",
  );
  await assertRejects(
    async () =>
      await analyticsGetStatistics.execute(
        {
          facetType: "accounts",
          facetIds: "1",
          pivots: ["CAMPAIGN", "CREATIVE", "ACCOUNT", "COMPANY"],
          dateStart: "2024-01-01",
          timeGranularity: "ALL",
        },
        ctx,
      ),
    Error,
    "Pivots",
  );
  assertEquals(calls.length, 0);
});
