import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import affiliateRegister from "../../actions/affiliate-register.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

test("affiliate-register: calls POST /affiliates/{id}/register with product_ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await affiliateRegister.execute({ affiliateId: "edward_mann", productIds: ["1", "2"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates/edward_mann/register");
  assertEquals(formOf(calls[0]).product_ids, ["1", "2"]);
});
