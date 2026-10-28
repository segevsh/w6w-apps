import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/property-get.ts";

Deno.test("property-get: reads the property off the Admin host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "properties/123" } }], {
    display: { propertyId: "123" },
  });
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://analyticsadmin.googleapis.com/v1beta/properties/123");
  assertEquals(result, { name: "properties/123" });
});

Deno.test("property-get: a prefixed override is normalized", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: { propertyId: "123" } });
  await action.execute!({ propertyId: "properties/999" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/999");
});
