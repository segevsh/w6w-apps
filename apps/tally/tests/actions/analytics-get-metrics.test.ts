import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/analytics-get-metrics.ts";

Deno.test("analytics-get-metrics: GETs the metrics for a period", async () => {
  const metrics = {
    visits: 100,
    submissions: 40,
    uniqueRespondents: 38,
    totalViews: 120,
    starts: 60,
    completions: 40,
    completionRate: 0.66,
  };
  const { ctx, calls } = mockCtx([{ body: metrics }]);
  const result = await action.execute({ formId: "f1", period: "7d" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/forms/f1/analytics/metrics");
  assertEquals(url.searchParams.get("period"), "7d");
  assertEquals(result.visits, 100);
  assertEquals(result.completionRate, 0.66);
  assertEquals(result.metrics, metrics);
});

Deno.test("analytics-get-metrics: period is required and offers Tally's nine windows", () => {
  const period = action.params?.find((p) => p.key === "period");
  assertEquals(period?.required, true);
  assertEquals(
    (period?.options as Array<{ value: string }>).map((o) => o.value),
    ["today", "yesterday", "24h", "7d", "30d", "3m", "6m", "12m", "all"],
  );
});
