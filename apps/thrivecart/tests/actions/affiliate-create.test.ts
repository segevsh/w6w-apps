import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import affiliateCreate from "../../actions/affiliate-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

test("affiliate-create: calls POST /affiliates and sends product_ids as repeated []", async () => {
  const { ctx, calls } = mockCtx([{ body: { user_id: "1" } }]);
  await affiliateCreate.execute(
    { email: "aff@example.com", productIds: ["1", "2"] },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/external/affiliates");
  assertEquals(formOf(calls[0]), {
    email: "aff@example.com",
    product_ids: ["1", "2"],
  });
});

test("affiliate-create: a single productIds string is normalised into an array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await affiliateCreate.execute({ email: "a@b.com", productIds: "1" }, ctx);
  assertEquals(formOf(calls[0]).product_ids, "1");
});

test("affiliate-create: is not idempotent", () => {
  assertEquals(affiliateCreate.idempotent, false);
});
