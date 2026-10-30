import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/metric-list.ts";

const conn = { display: { projectKey: "default" } };

test("metric-list: reads a project's metrics", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ key: "conversion" }] } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ key: "conversion" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/metrics/default");
  assert(action.type === "read");
});
