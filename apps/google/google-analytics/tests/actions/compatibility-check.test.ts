import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/compatibility-check.ts";

const display = { propertyId: "123" };

Deno.test("compatibility-check: asks which fields still combine", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { dimensionCompatibilities: [] } }], {
    display,
  });
  await action.execute!({
    dimensions: "date",
    metrics: "sessions",
    compatibilityFilter: "COMPATIBLE",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123:checkCompatibility");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.dimensions, [{ name: "date" }]);
  assertEquals(body.compatibilityFilter, "COMPATIBLE");
});

Deno.test("compatibility-check: with neither dimensions nor metrics there is nothing to ask", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "nothing to check");
  assertEquals(calls.length, 0);
});
