import { assertEquals } from "@std/assert";
import campaignStatsGet from "../../actions/campaign-stats-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-stats-get: GETs /campaigns/{id}/stats", async () => {
  const { ctx, calls } = mockCtx([
    { body: { sent_count: 100, unique_open_count: 40, open_rate: 0.4 } },
  ]);
  const out = await campaignStatsGet.execute({ id: 7 }, ctx) as { sent_count: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/campaigns/7/stats");
  assertEquals(out.sent_count, 100);
});

Deno.test("campaign-stats-get: the link-stat opt-in and limit are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: { sent_count: 1 } }]);
  await campaignStatsGet.execute({ id: 7, includeLinkStats: true, linkLimit: 10 }, ctx);

  assertEquals(queryOf(calls[0].url), { include_link_stats: "true", link_limit: "10" });
});

/**
 * Both link-stat parameters are opt-in at the wire level: the declarative
 * default of 50 is applied by the host, and an UNSET value is simply omitted
 * here rather than sent as a meaningless `link_limit` on a call that will not
 * read link stats anyway.
 */
Deno.test("campaign-stats-get: unset link-stat params are omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await campaignStatsGet.execute({ id: 7 }, ctx);

  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("campaign-stats-get: link_limit declares the vendor's own 50 default", () => {
  const linkLimit = (campaignStatsGet.params ?? []).find((p) => p.key === "linkLimit");
  assertEquals(linkLimit?.default, 50);
  assertEquals(linkLimit?.validation?.max, 100);
});
