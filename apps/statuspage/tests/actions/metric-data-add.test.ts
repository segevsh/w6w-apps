import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/metric-data-add.ts";

const conn = { display: { pageId: "pg1" } };

/** SECONDS — milliseconds land the point ~50,000 years out, silently. */
Deno.test("metric-data-add: an ISO timestamp becomes Unix seconds", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ metricId: "m1", value: 12.5, timestamp: "2026-08-18T12:00:00Z" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data, [{ timestamp: 1787054400, value: 12.5 }]);
  assert(sent.data[0].timestamp < 2e10, "seconds, not milliseconds");
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/pg1/metrics/m1/data");
});

Deno.test("metric-data-add: with no timestamp it uses now, in seconds", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ metricId: "m1", value: 1 }, ctx);
  const ts = JSON.parse(calls[0].body!).data[0].timestamp;
  assert(Math.abs(ts - Math.floor(Date.now() / 1000)) < 60, String(ts));
});

/** A backfill is one request rather than many, at one per second. */
Deno.test("metric-data-add: several points go in one request", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  const out = await action.execute!({
    metricId: "m1",
    points: '[{"timestamp":1755000000,"value":1},{"timestamp":1755000060,"value":2}]',
  }, ctx) as { count: number };
  assertEquals(out.count, 2);
  assertEquals(JSON.parse(calls[0].body!).data.length, 2);
});

Deno.test("metric-data-add: an unreadable timestamp is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ metricId: "m1", value: 1, timestamp: "soon" }, ctx),
    Error,
    "timestamp",
  );
  assertEquals(calls.length, 0);
});

Deno.test("metric-data-add: a missing metric is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ value: 1 }, ctx), Error, "metricId");
});
