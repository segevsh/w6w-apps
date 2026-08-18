import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/chart-query.ts";

Deno.test("chart-query: runs a saved chart by id", async () => {
  const { ctx, calls } = mockCtx([ok({ data: { series: [[1, 2, 3]] } })], { display });
  const result = await action.execute!({ chartId: "abc123" }, ctx) as {
    seriesCount: number;
    chartId: string;
  };
  assertEquals(new URL(calls[0].url).pathname, "/api/3/chart/abc123/query");
  assertEquals(result.seriesCount, 1);
  assertEquals(result.chartId, "abc123");
});

/** Pasting the whole URL is the obvious mistake. */
Deno.test("chart-query: a URL in the id slot is refused, with the id pointed out", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () =>
      await action.execute!(
        { chartId: "https://app.amplitude.com/analytics/x/chart/abc123/x" },
        ctx,
      ),
    Error,
  );
  assert(/just the id, not a URL/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

/** The shape depends on the chart type, so only the count is safe to report. */
Deno.test("chart-query: a shape with no series reports no count and still returns the data", async () => {
  const { ctx } = mockCtx([ok({ data: { stepFunction: [100, 40] } })], { display });
  const result = await action.execute!({ chartId: "abc123" }, ctx) as {
    seriesCount?: number;
    data: { stepFunction: number[] };
  };
  assertEquals(result.seriesCount, undefined);
  assertEquals(result.data.stepFunction, [100, 40]);
});

Deno.test("chart-query: needs a chart id", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`chartId` is required");
});

Deno.test("chart-query: logs the id and series count", async () => {
  const { ctx, logs } = mockCtx([ok({ data: { series: [] } })], { display });
  await action.execute!({ chartId: "abc123" }, ctx);
  assertEquals(logs[0].data, { chartId: "abc123", seriesCount: 0 });
});

/** The chart's own date range is used and cannot be overridden. */
Deno.test("chart-query: says the saved date range applies", () => {
  assert(/cannot be overridden/.test(action.description!), action.description);
});
