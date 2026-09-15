import { assertEquals } from "@std/assert";
import productList from "../../actions/product-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-list: passes country/currency/subcategory filters through", async () => {
  const page = { products: [{ id: "OKMHM2X2OHYV", name: "Amazon.com" }] };
  const { ctx, calls } = mockCtx([{ status: 200, body: page }]);
  const result = await productList.execute(
    { country: "US,GB", currency: "USD,EUR", subcategory: "electronics" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v2/products");
  assertEquals(queryOf(calls[0].url), {
    country: "US,GB",
    currency: "USD,EUR",
    subcategory: "electronics",
  });
  assertEquals(result, page);
});

Deno.test("product-list: no filters means no query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { products: [] } }]);
  await productList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
