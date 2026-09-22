import { assertEquals } from "@std/assert";
import keywordMetricsGet from "../../actions/keyword-metrics-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("keyword-metrics-get: GETs the metrics and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        competitive_density: 0.42,
        cpc: "1.23",
        intents: ["commercial"],
        keyword_difficulty: 61,
        number_of_results: "1200000",
        search_volume: "90500",
        serp_features: ["featured_snippet"],
        trends: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      }),
    },
  ]);

  const out = await keywordMetricsGet.execute(
    { keyword: "running shoes", country: "us", month: "2026-09" },
    ctx,
  ) as { data: Record<string, unknown> };

  assertEquals(pathOf(calls[0].url), "/apis/v4/keywords/v1/metrics");
  assertEquals(queryOf(calls[0].url), {
    keyword: "running shoes",
    country: "us",
    month: "2026-09",
  });
  // The vendor returns `cpc` as a string; this app keeps it that way.
  assertEquals(out.data.cpc, "1.23");
  assertEquals(out.data.search_volume, "90500");
  assertEquals((out.data.trends as number[]).length, 12);
});

Deno.test("keyword-metrics-get: `month` is optional and omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ search_volume: "10" }) }]);

  await keywordMetricsGet.execute({ keyword: "seo", country: "uk" }, ctx);

  assertEquals(queryOf(calls[0].url), { keyword: "seo", country: "uk" });
});

Deno.test("keyword-metrics-get: keyword and country are required, month is not", () => {
  const params = keywordMetricsGet.params ?? [];
  assertEquals(params.find((p) => p.key === "keyword")?.required, true);
  assertEquals(params.find((p) => p.key === "country")?.required, true);
  assertEquals(params.find((p) => p.key === "month")?.required, undefined);
  assertEquals(params.find((p) => p.key === "keyword")?.validation?.maxLength, 255);
});
