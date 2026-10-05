import { assertEquals, assertRejects } from "@std/assert";
import variantCategoryUpdate from "../../actions/variant-category-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "productId": "productId-1==",
  "variantCategoryId": "variantCategoryId-1==",
  "title": "title-1",
};

Deno.test("variant-category-update: sends PUT /v2/products/productId-1%3D%3D/variant_categories/variantCategoryId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "variant_category": { "id": "x1", "marker": true } },
  }]);
  await variantCategoryUpdate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/products/productId-1%3D%3D/variant_categories/variantCategoryId-1%3D%3D",
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals([...new URLSearchParams(calls[0].body ?? "")], [["title", "title-1"]]);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("variant-category-update: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "variant_category": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await variantCategoryUpdate.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("variant-category-update: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(variantCategoryUpdate.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("variant-category-update: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(
    () => Promise.resolve(variantCategoryUpdate.execute(INPUT, ctx)),
    Error,
    "refused",
  );
});
