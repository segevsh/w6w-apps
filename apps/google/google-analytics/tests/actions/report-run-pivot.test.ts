import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/report-run-pivot.ts";

const display = { propertyId: "123" };

Deno.test("report-run-pivot: sends the pivot array alongside dimensions and metrics", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { rows: [] } }], { display });
  await action.execute!({
    dimensions: "country,browser",
    metrics: "sessions",
    pivots: '[{"fieldNames":["country"],"limit":10}]',
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123:runPivotReport");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.pivots, [{ fieldNames: ["country"], limit: 10 }]);
  assertEquals(body.dimensions, [{ name: "country" }, { name: "browser" }]);
});

Deno.test("report-run-pivot: dimensions, metrics and a non-empty pivot are all required", async () => {
  for (
    const [patch, needle] of [
      [{ metrics: "sessions", pivots: "[{}]" }, "dimensions"],
      [{ dimensions: "country", pivots: "[{}]" }, "metrics"],
      [{ dimensions: "country", metrics: "sessions", pivots: "[]" }, "pivots"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(patch, ctx), Error, needle);
    assertEquals(calls.length, 0);
  }
});
