import { assertEquals } from "@std/assert";
import affiliateReject from "../../actions/affiliate-reject.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-reject: calls POST /affiliates/{id}/reject with product_ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await affiliateReject.execute({ affiliateId: "edward_mann", productIds: ["1"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates/edward_mann/reject");
  assertEquals(formOf(calls[0]).product_ids, "1");
});
