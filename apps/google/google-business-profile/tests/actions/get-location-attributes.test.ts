import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-location-attributes.ts";

Deno.test("get-location-attributes: GETs /v1/locations/{id}/attributes", async () => {
  const body = { name: "locations/1/attributes", attributes: [{ name: "attributes/has_wifi" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ locationId: "1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/locations/1/attributes");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
