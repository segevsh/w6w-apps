import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/artist-get.ts";

Deno.test("artist-get: GETs /artists/{id}, accepting a URI", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "0TnOYISbd1XYRBk9myaseg" } }]);
  await action.execute({ id: "spotify:artist:0TnOYISbd1XYRBk9myaseg" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/artists/0TnOYISbd1XYRBk9myaseg");
  // No market filter on this endpoint.
  assertEquals(new URL(calls[0].url).search, "");
});
