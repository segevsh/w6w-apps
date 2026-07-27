import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-get-many.ts";

const display = { storeUrl: "https://shop.example.com" };

Deno.test("order-get-many: GETs /orders with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wp-json/wc/v3/orders");
  assertEquals(url.searchParams.get("per_page"), "10");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("order-get-many: forwards filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!(
    { search: "abc", status: "completed", customer: 9, product: 5, orderBy: "date", order: "desc" },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("search"), "abc");
  assertEquals(p.get("status"), "completed");
  assertEquals(p.get("customer"), "9");
  assertEquals(p.get("product"), "5");
  assertEquals(p.get("orderby"), "date");
  assertEquals(p.get("order"), "desc");
});

Deno.test("order-get-many: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const p = new URL(calls[0].url).searchParams;
  assert(!p.has("status"));
  assert(!p.has("customer"));
});
