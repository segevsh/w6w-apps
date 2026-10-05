import { assertEquals, assertRejects } from "@std/assert";
import variantCategoryGet from "../../actions/variant-category-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==", "variantCategoryId": "variantCategoryId-1==" };

Deno.test("variant-category-get: sends GET /v2/products/productId-1%3D%3D/variant_categories/variantCategoryId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "variant_category": { "id": "x1", "marker": true } },
  }]);
  await variantCategoryGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/products/productId-1%3D%3D/variant_categories/variantCategoryId-1%3D%3D",
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("variant-category-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "variant_category": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await variantCategoryGet.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("variant-category-get: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(variantCategoryGet.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("variant-category-get: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(
    () => Promise.resolve(variantCategoryGet.execute(INPUT, ctx)),
    Error,
    "refused",
  );
});
