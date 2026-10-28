import { assertEquals, assertRejects } from "@std/assert";
import analyticsGet from "../../actions/analytics-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("analytics-get: builds pivot/timeGranularity/dateRange and a campaigns facet", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await analyticsGet.execute(
    {
      facetType: "campaigns",
      facetIds: "1234567",
      pivot: "CREATIVE",
      dateStart: "2024-01-01",
      timeGranularity: "ALL",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/rest/adAnalytics");
  const q = queryOf(calls[0].url);
  assertEquals(q.q, "analytics");
  assertEquals(q.pivot, "CREATIVE");
  assertEquals(q.timeGranularity, "ALL");
  assertEquals(q.dateRange, "(start:(year:2024,month:1,day:1))");
  assertEquals(q.campaigns, "List(urn:li:sponsoredCampaign:1234567)");
});

Deno.test("analytics-get: an end date adds end to the dateRange", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await analyticsGet.execute(
    {
      facetType: "accounts",
      facetIds: "1",
      dateStart: "2024-05-28",
      dateEnd: "2024-09-30",
      timeGranularity: "DAILY",
    },
    ctx,
  );
  assertEquals(
    queryOf(calls[0].url).dateRange,
    "(start:(year:2024,month:5,day:28),end:(year:2024,month:9,day:30))",
  );
});

Deno.test("analytics-get: fields always includes dateRange and pivotValues alongside the chosen metrics", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await analyticsGet.execute(
    {
      facetType: "accounts",
      facetIds: "1",
      dateStart: "2024-01-01",
      timeGranularity: "ALL",
      fields: ["impressions", "clicks"],
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).fields, "dateRange,pivotValues,impressions,clicks");
});

Deno.test("analytics-get: with no fields chosen, fields is omitted (LinkedIn's own impressions+clicks default applies)", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await analyticsGet.execute(
    { facetType: "accounts", facetIds: "1", dateStart: "2024-01-01", timeGranularity: "ALL" },
    ctx,
  );
  assertEquals("fields" in queryOf(calls[0].url), false);
});

Deno.test("analytics-get: multiple comma-separated facet ids all become URNs in one List()", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await analyticsGet.execute(
    {
      facetType: "companies",
      facetIds: "1111, 2222",
      dateStart: "2024-01-01",
      timeGranularity: "ALL",
    },
    ctx,
  );
  assertEquals(
    queryOf(calls[0].url).companies,
    "List(urn:li:organization:1111,urn:li:organization:2222)",
  );
});

Deno.test("analytics-get: shares are passed through as already-typed URNs, not re-prefixed", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await analyticsGet.execute(
    {
      facetType: "shares",
      facetIds: "urn:li:share:1",
      dateStart: "2024-01-01",
      timeGranularity: "ALL",
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).shares, "List(urn:li:share:1)");
});

Deno.test("analytics-get: rejects an empty facet id list, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await analyticsGet.execute(
        { facetType: "accounts", facetIds: "", dateStart: "2024-01-01", timeGranularity: "ALL" },
        ctx,
      ),
    Error,
    "Facet ID",
  );
  assertEquals(calls.length, 0);
});
