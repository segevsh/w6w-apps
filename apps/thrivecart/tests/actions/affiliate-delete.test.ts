import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import affiliateDelete from "../../actions/affiliate-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("affiliate-delete: calls POST /affiliates/{id}/delete", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await affiliateDelete.execute({ affiliateId: "edward_mann" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates/edward_mann/delete");
});

test("affiliate-delete: is idempotent", () => {
  assertEquals(affiliateDelete.idempotent, true);
});
