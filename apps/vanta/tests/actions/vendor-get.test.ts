import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/vendor-get.ts";

Deno.test("vendor-get: fetches one vendor by id", async () => {
  const { ctx, calls } = mockCtx([one({ id: "v1", inherentRiskLevel: "HIGH" })], { display });
  const result = await action.execute!({ vendorId: "v1" }, ctx) as { inherentRiskLevel: string };
  assertEquals(calls[0].url, "https://api.vanta.com/v1/vendors/v1");
  assertEquals(result.inherentRiskLevel, "HIGH");
});

Deno.test("vendor-get: needs a vendor id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "vendorId");
  assertEquals(calls.length, 0);
});

/** Two vendors are the same row in a list and different obligations. */
Deno.test("vendor-get: separates an inventory from a risk picture", () => {
  assert(/risk picture/.test(action.description!), action.description);
});
