import { assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/location-get-many.ts";

Deno.test("location-get-many: GETs /locations.json and takes no params", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { locations: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/locations.json");
  assertEquals(action.params, []);
});
