import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/location-get.ts";

Deno.test("location-get: GETs /v2/locations/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { location: { id: "L1" } } }]);
  await action.execute({ locationId: "L1" }, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/locations/L1");
});

Deno.test("location-get: percent-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ locationId: "a/b?c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/locations/a%2Fb%3Fc");
});

Deno.test("location-get: the hint documents Square's `main` alias", () => {
  const p = action.params?.find((p) => p.key === "locationId");
  assert(p?.hint?.includes("main"), p?.hint);
});
