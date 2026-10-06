import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-venue.ts";

Deno.test("update-venue: POST /venues/{id}/ with wrapped venue", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "3" } }]);
  await action.execute!({ venueId: "3", name: "New", address1: "1 Main St" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/venues/3/");
  assertEquals(JSON.parse(calls[0].body!), {
    venue: { name: "New", address: { address_1: "1 Main St" } },
  });
});
