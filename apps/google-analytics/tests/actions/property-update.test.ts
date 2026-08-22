import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/property-update.ts";

const display = { propertyId: "123" };

/**
 * Google rejects a PATCH with no `updateMask` and will not infer intent from
 * the body. The mask is built from exactly what was set, so an unset field can
 * never blank a setting.
 */
Deno.test("property-update: sends an updateMask built from the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ displayName: "Renamed", currencyCode: "EUR" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1beta/properties/123");
  assertEquals(url.searchParams.get("updateMask"), "displayName,currencyCode");
  assertEquals(JSON.parse(calls[0].body!), { displayName: "Renamed", currencyCode: "EUR" });
});

Deno.test("property-update: the mask is never a wildcard", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ timeZone: "UTC" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("updateMask"), "timeZone");
});

Deno.test("property-update: refuses a no-op", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "nothing to update");
  assertEquals(calls.length, 0);
});
