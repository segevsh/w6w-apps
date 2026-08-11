import { assertEquals } from "@std/assert";
import productList from "../../actions/product-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

Deno.test("product-list: GETs /v3/catalog/products and returns data + pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ id: 77 }], { total: 1, total_pages: 1 }) }]);
  const out = await productList.execute({ limit: 50 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/products");
  assertEquals(queryOf(calls[0].url), { limit: "50" });
  assertEquals(out.data, [{ id: 77 }]);
  assertEquals(out.pagination?.total, 1);
});

Deno.test("product-list: the two boolean filters use the vendor's TWO spellings", async () => {
  // `is_visible` is `type: boolean` in the schema; `is_featured` is
  // `type: integer` documented as "1 for true, 0 for false". Sending the wrong
  // one filters on nothing and silently returns the whole catalog.
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await productList.execute({ isVisible: true, isFeatured: true }, ctx);
  assertEquals(queryOf(calls[0].url), { is_visible: "true", is_featured: "1" });

  const off = mockCtx([{ body: v3Page([]) }]);
  await productList.execute({ isVisible: false, isFeatured: false }, off.ctx);
  assertEquals(queryOf(off.calls[0].url), { is_visible: "false", is_featured: "0" });
});

Deno.test("product-list: filters map to the vendor's parameter names", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await productList.execute({
    keyword: "mug",
    brandId: 3,
    categoryId: 12,
    dateModifiedMin: "2026-08-01",
    include: ["variants", "images"],
    sort: "date_modified",
    direction: "desc",
    includeFields: "name,price",
    page: 2,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    keyword: "mug",
    brand_id: "3",
    categories: "12",
    "date_modified:min": "2026-08-01",
    include: "variants,images",
    sort: "date_modified",
    direction: "desc",
    include_fields: "name,price",
    page: "2",
  });
});

Deno.test("product-list: restates the vendor's own default and ceiling", () => {
  const limit = productList.params?.find((p) => p.key === "limit");
  assertEquals(limit?.default, 50);
  assertEquals(limit?.validation?.max, 250);
});
