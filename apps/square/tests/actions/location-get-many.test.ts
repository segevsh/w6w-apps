import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/location-get-many.ts";

Deno.test("location-get-many: GETs /v2/locations with no query at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { locations: [{ id: "L1" }] } }]);
  const out = await action.execute({}, ctx) as { locations: unknown[] };
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/locations");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.locations.length, 1);
});

Deno.test("location-get-many: declares no params — Square paginates nothing here", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "search");
});
