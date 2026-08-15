import { assertEquals } from "@std/assert";
import callSummaryGet from "../../actions/call-summary-get.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("call-summary-get: hits calls/summary.json and forwards group_by + tags/trackers arrays", async () => {
  const { ctx, calls } = mockCtx([{
    body: { start_date: "2016-10-10", end_date: "2016-11-09", total_results: { total_calls: 160 } },
  }]);
  const out = await callSummaryGet.execute(
    { accountId: "ACC1", groupBy: "source", tags: "A,B", trackerIds: "TRK1,TRK2" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/calls/summary.json");
  assertEquals(queryOf(calls[0].url).group_by, "source");
  assertEquals(queryAllOf(calls[0].url, "tags"), ["A", "B"]);
  assertEquals(queryAllOf(calls[0].url, "tracker_ids"), ["TRK1", "TRK2"]);
  assertEquals(out.total_results, { total_calls: 160 });
});
