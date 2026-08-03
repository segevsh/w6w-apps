import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/location-get-many.ts";

Deno.test("location-get-many: GETs /locations and unwraps `locations`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { locations: [{ id: 1 }] } }]);
  const out = await action.execute({ perPage: 100 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/locations?per_page=100");
  assertEquals(out, { locations: [{ id: 1 }] });
});
