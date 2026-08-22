import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/report-run-realtime.ts";

const display = { propertyId: "123" };

Deno.test("report-run-realtime: sends minuteRanges and never a dateRange", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { rows: [] } }], { display });
  await action.execute!({ metrics: "activeUsers", minutesAgoStart: 29, minutesAgoEnd: 0 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123:runRealtimeReport");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.minuteRanges, [{ startMinutesAgo: 29, endMinutesAgo: 0 }]);
  // The realtime request schema has no dateRanges field at all.
  assertEquals(body.dateRanges, undefined);
});

Deno.test("report-run-realtime: omitting the window omits minuteRanges entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ metrics: "activeUsers" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).minuteRanges, undefined);
});

Deno.test("report-run-realtime: metrics are required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`metrics` is required");
  assertEquals(calls.length, 0);
});
