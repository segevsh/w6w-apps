import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/report-run.ts";

const display = { propertyId: "123" };

Deno.test("report-run: expands comma lists into GA4's [{name}] arrays", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { rows: [] } }], { display });
  await action.execute!({ dimensions: "date, country", metrics: "activeUsers,sessions" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://analyticsdata.googleapis.com/v1beta/properties/123:runReport",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.dimensions, [{ name: "date" }, { name: "country" }]);
  assertEquals(body.metrics, [{ name: "activeUsers" }, { name: "sessions" }]);
  assertEquals(body.dateRanges, [{ startDate: "28daysAgo", endDate: "yesterday" }]);
});

Deno.test("report-run: limit and offset are int64, so they go on the wire as strings", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ metrics: "sessions", limit: 500, offset: 1000 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.limit, "500");
  assertEquals(body.offset, "1000");
});

Deno.test("report-run: filters and orderBys pass through as parsed JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    metrics: "sessions",
    dimensionFilter: '{"filter":{"fieldName":"country","stringFilter":{"value":"Japan"}}}',
    orderBys: '[{"metric":{"metricName":"sessions"},"desc":true}]',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.dimensionFilter.filter.fieldName, "country");
  assertEquals(body.orderBys[0].desc, true);
});

Deno.test("report-run: the property param overrides the connection's", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ metrics: "sessions", propertyId: "properties/999" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/999:runReport");
});

Deno.test("report-run: metrics are required and bad JSON is named", async () => {
  const noMetrics = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ dimensions: "date" }, noMetrics.ctx),
    Error,
    "`metrics` is required",
  );
  const badJson = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ metrics: "sessions", orderBys: "{oops" }, badJson.ctx),
    Error,
    "orderBys",
  );
  assertEquals(noMetrics.calls.length + badJson.calls.length, 0);
});
