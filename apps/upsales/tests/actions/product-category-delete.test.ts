import { assertEquals, assertRejects } from "@std/assert";
import productCategoryDelete from "../../actions/product-category-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("product-category-delete: DELETEs /productCategories/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: null } }]);
  const out = await productCategoryDelete.execute({ id: 7 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/productCategories/7`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, id: 7 });
});

Deno.test("product-category-delete: is marked idempotent", () => {
  assertEquals(productCategoryDelete.idempotent, true);
});

Deno.test("product-category-delete: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () => await productCategoryDelete.execute({ id: 7 }, ctx),
    Error,
    "401",
  );
});

Deno.test("product-category-delete: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () => await productCategoryDelete.execute({ id: 7 }, ctx),
    Error,
    "ThrottleLimit",
  );
});
