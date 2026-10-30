import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import methodGet from "../../actions/method-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("method-get: fetches /methods/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ideal", description: "iDEAL" } }]);
  const out = await methodGet.execute({ methodId: "ideal" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/methods/ideal");
  assertEquals(out, { id: "ideal", description: "iDEAL" });
});
