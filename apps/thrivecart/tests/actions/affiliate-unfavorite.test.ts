import { assertEquals } from "@std/assert";
import affiliateUnfavorite from "../../actions/affiliate-unfavorite.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-unfavorite: calls POST /affiliates/{id}/unfavorite", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await affiliateUnfavorite.execute({ affiliateId: "edward_mann" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates/edward_mann/unfavorite");
});
