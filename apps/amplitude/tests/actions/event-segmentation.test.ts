import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/event-segmentation.ts";

const chart = ok({
  data: {
    series: [[10, 20, 30], [1, 2, 3]],
    seriesLabels: ["GB", "US"],
    xValues: ["2026-08-01", "2026-08-02", "2026-08-03"],
  },
});

/** `e` is a JSON object serialised into a query parameter. */
Deno.test("event-segmentation: serialises the event object into the `e` parameter", async () => {
  const { ctx, calls } = mockCtx([chart], { display });
  await action.execute!({
    event: '{"event_type":"Checkout Completed"}',
    start: "20260801",
    end: "20260803",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/2/events/segmentation");
  assertEquals(url.searchParams.get("e"), '{"event_type":"Checkout Completed"}');
  assertEquals(url.searchParams.get("start"), "20260801");
});

/**
 * The response is parallel arrays — the nth number belongs to the nth date, and
 * the series has no labels inside it.
 */
Deno.test("event-segmentation: zips the parallel arrays into labelled points", async () => {
  const { ctx } = mockCtx([chart], { display });
  const result = await action.execute!({
    event: '{"event_type":"a"}',
    start: "20260801",
    end: "20260803",
  }, ctx) as { points: Array<{ date: string; label: string; value: number }>; total: number };
  assertEquals(result.points.length, 6);
  assertEquals(result.points[0], { date: "2026-08-01", label: "GB", value: 10 });
  assertEquals(result.points[3], { date: "2026-08-01", label: "US", value: 1 });
  assertEquals(result.total, 60, "the first series summed");
});

Deno.test("event-segmentation: the raw arrays come back untouched too", async () => {
  const { ctx } = mockCtx([chart], { display });
  const result = await action.execute!({
    event: '{"event_type":"a"}',
    start: "20260801",
    end: "20260803",
  }, ctx) as { series: number[][]; xValues: string[] };
  assertEquals(result.series.length, 2);
  assertEquals(result.xValues.length, 3);
});

Deno.test("event-segmentation: metric, interval and group-by reach the wire", async () => {
  const { ctx, calls } = mockCtx([chart], { display });
  await action.execute!({
    event: '{"event_type":"a"}',
    start: "20260801",
    end: "20260803",
    metric: "totals",
    interval: "7",
    groupBy: "country",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("m"), "totals");
  assertEquals(url.searchParams.get("i"), "7");
  assertEquals(url.searchParams.get("g"), "country");
});

Deno.test("event-segmentation: a segment is serialised into `s`", async () => {
  const { ctx, calls } = mockCtx([chart], { display });
  await action.execute!({
    event: '{"event_type":"a"}',
    start: "20260801",
    end: "20260803",
    segments: '[{"prop":"country","op":"is","values":["GB"]}]',
  }, ctx);
  assert(new URL(calls[0].url).searchParams.get("s")!.includes("country"));
});

Deno.test("event-segmentation: needs an event and both dates", async () => {
  const noEvent = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ start: "20260801", end: "20260803" }, noEvent.ctx),
    Error,
    "`event` is required",
  );
  const noDates = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ event: '{"event_type":"a"}' }, noDates.ctx),
    Error,
    "both required",
  );
});

Deno.test("event-segmentation: logs shapes, never the query or the numbers", async () => {
  const { ctx, logs } = mockCtx([chart], { display });
  await action.execute!({
    event: '{"event_type":"Secret Event"}',
    start: "20260801",
    end: "20260803",
  }, ctx);
  assert(!JSON.stringify(logs).includes("Secret"), JSON.stringify(logs));
  assertEquals(logs[0].data, { series: 2, points: 6 });
});

Deno.test("event-segmentation: says the response is parallel arrays", () => {
  assert(/PARALLEL ARRAYS/.test(action.description!), action.description);
});
