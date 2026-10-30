import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-place-action-link.ts";

test("create-place-action-link: POSTs /v1/locations/{id}/placeActionLinks with the link body", async () => {
  const body = {
    name: "locations/1/placeActionLinks/2",
    uri: "https://order.example.com",
    placeActionType: "FOOD_ORDERING",
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({
    locationId: "1",
    uri: "https://order.example.com",
    placeActionType: "FOOD_ORDERING",
    isPreferred: true,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/locations/1/placeActionLinks");
  assertEquals(JSON.parse(calls[0].body!), {
    uri: "https://order.example.com",
    placeActionType: "FOOD_ORDERING",
    isPreferred: true,
  });
  assertEquals(result, body);
});

test("create-place-action-link: is marked non-idempotent — retrying creates another link", () => {
  assertEquals(action.idempotent, false);
});
