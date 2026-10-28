import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/custom-dimension-list.ts";

Deno.test("custom-dimension-list: lists the property's custom dimensions", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { customDimensions: [{ parameterName: "plan" }] },
  }], { display: { propertyId: "123" } });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123/customDimensions");
  assertEquals(result, [{ parameterName: "plan" }]);
});
