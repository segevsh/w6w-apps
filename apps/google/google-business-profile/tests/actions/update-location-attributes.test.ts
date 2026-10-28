import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-location-attributes.ts";

Deno.test("update-location-attributes: PATCHes /v1/locations/{id}/attributes with attributeMask", async () => {
  const attributes = [{ name: "attributes/has_wifi", values: [true] }];
  const { ctx, calls } = mockCtx([{ body: { attributes } }]);
  const result = await action.execute!({
    locationId: "1",
    attributes,
    attributeMask: "attributes/has_wifi",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.pathname, "/v1/locations/1/attributes");
  assertEquals(url.searchParams.get("attributeMask"), "attributes/has_wifi");
  assertEquals(JSON.parse(calls[0].body!), { attributes });
  assertEquals(result, { attributes });
});

Deno.test("update-location-attributes: an empty attributes array with a mask deletes those attributes", async () => {
  const { ctx, calls } = mockCtx([{ body: { attributes: [] } }]);
  await action.execute!({
    locationId: "1",
    attributes: [],
    attributeMask: "attributes/has_wifi,attributes/has_parking",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { attributes: [] });
  assertEquals(
    new URL(calls[0].url).searchParams.get("attributeMask"),
    "attributes/has_wifi,attributes/has_parking",
  );
});
