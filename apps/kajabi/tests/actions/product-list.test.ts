import { assertEquals } from "@std/assert";
import productList from "../../actions/product-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "products") }]);
  await productList.execute({
    siteId: "111",
    status: "ready",
    excludeProductType: "Courses::CohortCourse",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/products");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[status_eq]"], "ready");
  assertEquals(q["filter[exclude_product_types][]"], "Courses::CohortCourse");
});

Deno.test("product-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "products") }]);
  await productList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
