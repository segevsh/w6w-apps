import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import affiliateFavorite from "../../actions/affiliate-favorite.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("affiliate-favorite: calls POST /affiliates/{id}/favorite", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await affiliateFavorite.execute({ affiliateId: "edward_mann" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates/edward_mann/favorite");
});

test("affiliate-favorite: is idempotent", () => {
  assertEquals(affiliateFavorite.idempotent, true);
});
