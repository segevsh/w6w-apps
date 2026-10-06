import { assertEquals } from "@std/assert";
import locationGet from "../../actions/location-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("location-get: GET /v1/locations/{id} unwraps { location }", async () => {
  const { ctx, calls } = mockCtx([{ body: { location: { id: 6, name: "Dock" } } }]);
  const out = await locationGet.execute({ locationId: 6 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/locations/6");
  assertEquals(out, { id: 6, name: "Dock" });
});
