import { assertEquals } from "@std/assert";
import affiliateCustomCommissionsSet from "../../actions/affiliate-custom-commissions-set.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-custom-commissions-set: sends the commission object JSON-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await affiliateCustomCommissionsSet.execute(
    { affiliateId: "edward_mann", productId: "1", commissionObject: { rate: 0.5 } },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates/edward_mann/custom_commissions");
  const form = formOf(calls[0]);
  assertEquals(form.product_id, "1");
  assertEquals(JSON.parse(form.commission_object as string), { rate: 0.5 });
});

Deno.test("affiliate-custom-commissions-set: an explicit null clears the override", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await affiliateCustomCommissionsSet.execute(
    { affiliateId: "edward_mann", productId: "1", commissionObject: null },
    ctx,
  );
  assertEquals(formOf(calls[0]).commission_object, "null");
});
