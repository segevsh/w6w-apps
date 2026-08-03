import { assert, assertEquals, assertThrows } from "@std/assert";
import { bodyOf, mockAdsCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/performance-report.ts";

const OK = { status: 200, body: { results: [] } };

Deno.test("performance-report: defaults to campaign level over the last 30 days", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("FROM campaign"));
  assert(q.includes("WHERE segments.date DURING LAST_30_DAYS"));
  assert(q.includes("ORDER BY metrics.impressions DESC"));
});

Deno.test("performance-report: selects the core metric set", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  for (
    const m of [
      "metrics.impressions",
      "metrics.clicks",
      "metrics.ctr",
      "metrics.average_cpc",
      "metrics.cost_micros",
      "metrics.conversions",
      "metrics.conversions_value",
    ]
  ) assert(q.includes(m), `missing ${m}`);
});

Deno.test("performance-report: explicit dates win over the predefined range", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    dateRange: "LAST_7_DAYS",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  }, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("segments.date BETWEEN '2026-07-01' AND '2026-07-31'"));
  assert(!q.includes("DURING"));
});

Deno.test("performance-report: a half-supplied custom range falls back to the range", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ dateRange: "TODAY", startDate: "2026-07-01" }, ctx);
  assert(queryOf(calls[0]).includes("segments.date DURING TODAY"));
});

Deno.test("performance-report: refuses a date range outside Google's closed set", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(() => action.execute({ dateRange: "LAST_45_DAYS" }, ctx), Error, "dateRange");
});

Deno.test("performance-report: refuses a start date that is not yyyy-MM-dd", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(
    () => action.execute({ startDate: "2026-07-01' OR '1", endDate: "2026-07-31" }, ctx),
    Error,
    "ISO date",
  );
});

Deno.test("performance-report: segments.date is opt-in — it changes the row count", async () => {
  const { ctx, calls } = mockAdsCtx([OK, OK]);
  await action.execute({}, ctx);
  assert(!queryOf(calls[0]).includes("segments.date,"));

  await action.execute({ segmentByDate: true }, ctx);
  assert(queryOf(calls[1]).includes("segments.date, metrics.impressions"));
});

Deno.test("performance-report: each level selects identity columns that make it readable", async () => {
  const cases: Array<[string, string]> = [
    ["customer", "customer.descriptive_name"],
    ["campaign", "campaign.name"],
    ["ad_group", "ad_group.name"],
    ["ad_group_ad", "ad_group_ad.ad.id"],
    ["ad_group_criterion", "ad_group_criterion.keyword.text"],
  ];
  for (const [resource, expected] of cases) {
    const { ctx, calls } = mockAdsCtx([OK]);
    await action.execute({ resource }, ctx);
    const q = queryOf(calls[0]);
    assert(q.includes(`FROM ${resource}`), `${resource}: wrong FROM`);
    assert(q.includes(expected), `${resource}: missing ${expected}`);
  }
});

Deno.test("performance-report: refuses a resource that is not a snake_case name", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(() => action.execute({ resource: "campaign WHERE 1=1" }, ctx), Error, "snake_case");
});

Deno.test("performance-report: appends a raw WHERE, extra fields, order and limit", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({
    where: "campaign.status = ENABLED",
    extraFields: "metrics.all_conversions",
    orderBy: "metrics.clicks DESC",
    limit: 20,
    pageToken: "tok",
  }, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("AND campaign.status = ENABLED"));
  assert(q.includes("metrics.all_conversions"));
  assert(q.includes("ORDER BY metrics.clicks DESC LIMIT 20"));
  assertEquals(bodyOf(calls[0]).pageToken, "tok");
});

Deno.test("performance-report: is a read", () => {
  assertEquals(action.type, "read");
});
