import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-venue.ts";

Deno.test("get-venue: GET /venues/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "3" } }]);
  await action.execute!({ venueId: "3" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/venues/3/");
});
