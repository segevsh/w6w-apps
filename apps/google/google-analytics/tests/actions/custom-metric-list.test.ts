import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/custom-metric-list.ts";

test("custom-metric-list: lists the property's custom metrics", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { customMetrics: [{ parameterName: "mrr" }] },
  }], {
    display: { propertyId: "123" },
  });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123/customMetrics");
  assertEquals(result, [{ parameterName: "mrr" }]);
});
