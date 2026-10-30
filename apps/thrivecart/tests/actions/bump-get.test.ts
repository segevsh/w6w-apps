import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import bumpGet from "../../actions/bump-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("bump-get: calls GET /bumps/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { bump_id: "1", name: "My Bump" } }]);
  const out = await bumpGet.execute({ bumpId: "1" }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/external/bumps/1");
  assertEquals(out.name, "My Bump");
});
