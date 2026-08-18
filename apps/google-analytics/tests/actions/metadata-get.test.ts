import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/metadata-get.ts";

Deno.test("metadata-get: reads the property's own dimension and metric catalogue", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { dimensions: [], metrics: [] } }], {
    display: { propertyId: "123" },
  });
  await action.execute!({}, ctx);
  assertEquals(
    calls[0].url,
    "https://analyticsdata.googleapis.com/v1beta/properties/123/metadata",
  );
});

Deno.test("metadata-get: no property anywhere is a directive error", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "propertyId");
  assertEquals(calls.length, 0);
});
