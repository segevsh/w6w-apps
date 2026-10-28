import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/data-stream-list.ts";

Deno.test("data-stream-list: lists the property's streams", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { dataStreams: [{ name: "properties/123/dataStreams/1" }] },
  }], { display: { propertyId: "123" } });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123/dataStreams");
  assertEquals(result, [{ name: "properties/123/dataStreams/1" }]);
});
