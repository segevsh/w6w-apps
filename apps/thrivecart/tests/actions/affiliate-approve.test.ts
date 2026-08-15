import { assertEquals } from "@std/assert";
import affiliateApprove from "../../actions/affiliate-approve.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-approve: calls POST /affiliates/{id}/approve with product_ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await affiliateApprove.execute({ affiliateId: "edward_mann", productIds: ["1"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates/edward_mann/approve");
  assertEquals(formOf(calls[0]).product_ids, "1");
});
