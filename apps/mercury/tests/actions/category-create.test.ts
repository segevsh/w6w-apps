import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import categoryCreate from "../../actions/category-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("category-create: POSTs /categories with all four required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cat_new", name: "Software" } }]);
  await categoryCreate.execute(
    {
      name: "Software",
      visibleForCardSpend: true,
      visibleForOther: false,
      visibleForReimbursements: true,
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/v1/categories");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Software",
    visibleForCardSpend: true,
    visibleForOther: false,
    visibleForReimbursements: true,
  });
});
