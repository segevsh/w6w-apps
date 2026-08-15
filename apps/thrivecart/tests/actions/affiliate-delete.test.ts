import { assertEquals } from "@std/assert";
import affiliateDelete from "../../actions/affiliate-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-delete: calls POST /affiliates/{id}/delete", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await affiliateDelete.execute({ affiliateId: "edward_mann" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates/edward_mann/delete");
});

Deno.test("affiliate-delete: is idempotent", () => {
  assertEquals(affiliateDelete.idempotent, true);
});
