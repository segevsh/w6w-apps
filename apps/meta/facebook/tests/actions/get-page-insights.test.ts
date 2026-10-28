import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-page-insights.ts";

Deno.test("get-page-insights: GETs /{pageId}/insights with metric and default period", async () => {
  const body = { data: [{ name: "page_impressions", period: "day", values: [] }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ pageId: "page-1", metric: "page_impressions" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/page-1/insights");
  assertEquals(url.searchParams.get("metric"), "page_impressions");
  assertEquals(url.searchParams.get("period"), "day");
  assertEquals(result, body);
});

Deno.test("get-page-insights: forwards period/since/until", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!(
    { pageId: "page-1", metric: "page_fans", period: "lifetime", since: "1000", until: "2000" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("period"), "lifetime");
  assertEquals(url.searchParams.get("since"), "1000");
  assertEquals(url.searchParams.get("until"), "2000");
});

Deno.test("get-page-insights: metric is a required param", () => {
  const metricParam = action.params?.find((p) => p.key === "metric");
  assertEquals(metricParam?.required, true);
});
