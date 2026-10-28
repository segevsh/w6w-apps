import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-place-action-links.ts";

Deno.test("list-place-action-links: GETs /v1/locations/{id}/placeActionLinks", async () => {
  const body = { placeActionLinks: [{ name: "locations/1/placeActionLinks/2" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ locationId: "1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.host, "mybusinessplaceactions.googleapis.com");
  assertEquals(url.pathname, "/v1/locations/1/placeActionLinks");
  assertEquals(result, body);
});

Deno.test("list-place-action-links: placeActionType filters using the documented filter grammar", async () => {
  const { ctx, calls } = mockCtx([{ body: { placeActionLinks: [] } }]);
  await action.execute!({ locationId: "1", placeActionType: "FOOD_ORDERING" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("filter"),
    "place_action_type=FOOD_ORDERING",
  );
});

Deno.test("list-place-action-links: omits the filter when no type is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { placeActionLinks: [] } }]);
  await action.execute!({ locationId: "1" }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("filter"));
});
