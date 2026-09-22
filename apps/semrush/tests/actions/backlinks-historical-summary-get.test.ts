import { assertEquals } from "@std/assert";
import backlinksHistoricalSummaryGet from "../../actions/backlinks-historical-summary-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-historical-summary-get: GETs the monthly series and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope([
        { month_date: "2026-08", backlinks_count: 10, domains_count: 3, url: "example.com" },
        { month_date: "2026-09", backlinks_count: 14, domains_count: 4, url: "example.com" },
      ]),
    },
  ]);

  const out = await backlinksHistoricalSummaryGet.execute(
    { url: "example.com", scope: "ROOT_DOMAIN", limit: 12 },
    ctx,
  ) as { data: Array<Record<string, unknown>> };

  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/summary");
  assertEquals(queryOf(calls[0].url), {
    url: "example.com",
    scope: "ROOT_DOMAIN",
    limit: "12",
  });
  assertEquals(out.data.length, 2);
  assertEquals(out.data[0].month_date, "2026-08");
});

Deno.test("backlinks-historical-summary-get: passes the date window through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await backlinksHistoricalSummaryGet.execute(
    {
      url: "example.com",
      scope: "SUBDOMAIN",
      date_from: "2025-01",
      date_to: "2025-12",
    },
    ctx,
  );

  const query = queryOf(calls[0].url);
  assertEquals(query.date_from, "2025-01");
  assertEquals(query.date_to, "2025-12");
});

Deno.test("backlinks-historical-summary-get: no SUBFOLDER, because a monthly series has none", () => {
  const scope = backlinksHistoricalSummaryGet.params?.find((p) => p.key === "scope");
  const values = Array.isArray(scope?.options) ? scope.options.map((o) => o.value) : [];
  assertEquals(values, ["ROOT_DOMAIN", "SUBDOMAIN", "PAGE"]);
});

Deno.test("backlinks-historical-summary-get: limit defaults to 12 months", () => {
  const limit = backlinksHistoricalSummaryGet.params?.find((p) => p.key === "limit");
  assertEquals(limit?.default, 12);
});
