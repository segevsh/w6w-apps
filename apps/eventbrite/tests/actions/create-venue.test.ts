import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-venue.ts";

Deno.test("create-venue: POST wrapped venue with nested address", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "3" } }]);
  await action.execute!(
    {
      organizationId: "o1",
      name: "Hall",
      capacity: 100,
      city: "Paris",
      country: "FR",
      extra: { address: { region: "75" }, google_place_id: "g" },
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/organizations/o1/venues/");
  assertEquals(JSON.parse(calls[0].body!), {
    venue: {
      name: "Hall",
      capacity: 100,
      address: { city: "Paris", country: "FR", region: "75" },
      google_place_id: "g",
    },
  });
});
