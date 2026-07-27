import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-get-many.ts";

const display = { storeUrl: "https://shop.example.com" };

Deno.test("product-get-many: GETs /products with defaults (per_page=10, page=1)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wp-json/wc/v3/products");
  assertEquals(url.searchParams.get("per_page"), "10");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("product-get-many: forwards filters with snake_case mapping", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!(
    {
      search: "widget",
      status: "publish",
      type: "simple",
      sku: "W-1",
      category: "12",
      tag: "7",
      featured: true,
      minPrice: "5",
      maxPrice: "50",
      stockStatus: "instock",
      orderBy: "date",
      order: "asc",
      after: "2026-01-01T00:00:00Z",
      before: "2026-12-31T23:59:59Z",
      perPage: 25,
      page: 2,
    },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("search"), "widget");
  assertEquals(p.get("status"), "publish");
  assertEquals(p.get("type"), "simple");
  assertEquals(p.get("sku"), "W-1");
  assertEquals(p.get("category"), "12");
  assertEquals(p.get("tag"), "7");
  assertEquals(p.get("featured"), "true");
  assertEquals(p.get("min_price"), "5");
  assertEquals(p.get("max_price"), "50");
  assertEquals(p.get("stock_status"), "instock");
  assertEquals(p.get("orderby"), "date");
  assertEquals(p.get("order"), "asc");
  assertEquals(p.get("per_page"), "25");
  assertEquals(p.get("page"), "2");
});

Deno.test("product-get-many: omits filters left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const p = new URL(calls[0].url).searchParams;
  assert(!p.has("search"));
  assert(!p.has("sku"));
  assert(!p.has("min_price"));
});
