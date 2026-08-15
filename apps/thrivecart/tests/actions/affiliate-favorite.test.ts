import { assertEquals } from "@std/assert";
import affiliateFavorite from "../../actions/affiliate-favorite.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-favorite: calls POST /affiliates/{id}/favorite", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await affiliateFavorite.execute({ affiliateId: "edward_mann" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates/edward_mann/favorite");
});

Deno.test("affiliate-favorite: is idempotent", () => {
  assertEquals(affiliateFavorite.idempotent, true);
});
