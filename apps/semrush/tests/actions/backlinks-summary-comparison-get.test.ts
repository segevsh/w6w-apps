import { assertEquals } from "@std/assert";
import backlinksSummaryComparisonGet from "../../actions/backlinks-summary-comparison-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-summary-comparison-get: joins `urls` into one comma-separated value", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope([
        { url: "a.example", month_date: "2026-09", backlinks_count: 3 },
        { url: "b.example", month_date: "2026-09", backlinks_count: 7 },
      ]),
    },
  ]);

  const out = await backlinksSummaryComparisonGet.execute(
    { urls: ["a.example", "b.example"], scope: "ROOT_DOMAIN" },
    ctx,
  ) as { data: Array<Record<string, unknown>> };

  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/comparison");
  assertEquals(queryOf(calls[0].url), {
    urls: "a.example,b.example",
    scope: "ROOT_DOMAIN",
  });
  assertEquals(out.data.length, 2);
});

Deno.test("backlinks-summary-comparison-get: requires urls and offers the three-target scope set", () => {
  const urls = backlinksSummaryComparisonGet.params?.find((p) => p.key === "urls");
  const scope = backlinksSummaryComparisonGet.params?.find((p) => p.key === "scope");
  const values = Array.isArray(scope?.options) ? scope.options.map((o) => o.value) : [];
  assertEquals(urls?.required, true);
  assertEquals(urls?.type, "array");
  assertEquals(values, ["ROOT_DOMAIN", "SUBDOMAIN", "PAGE"]);
});
