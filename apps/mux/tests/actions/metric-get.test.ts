import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/metric-get.ts";

test("metric-get: asks the Data API for an overall value", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { value: 1.2 } } }]);
  await action.execute!({ metric: "video_startup_time", timeframe: "24:hours" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/data/v1/metrics/video_startup_time/overall");
  assertEquals(url.searchParams.get("timeframe[]"), "24:hours");
});

/** An overall number rarely says anything; the same number sliced does. */
test("metric-get: filters go out as indexed parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    { metric: "rebuffer_percentage", filters: "browser:Chrome, country:GB" },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("filters[0]"), "browser:Chrome");
  assertEquals(q.get("filters[1]"), "country:GB");
});

test("metric-get: says it needs the Data product", () => {
  assert(/Mux Data product/.test(action.description!), action.description);
});

test("metric-get: a missing metric is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ metric: "" }, ctx), Error, "metric");
});
