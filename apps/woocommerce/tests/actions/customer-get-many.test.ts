import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-get-many.ts";

const display = { storeUrl: "https://shop.example.com" };

test("customer-get-many: GETs /customers with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wp-json/wc/v3/customers");
  assertEquals(url.searchParams.get("per_page"), "10");
  assertEquals(url.searchParams.get("page"), "1");
});

test("customer-get-many: forwards filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!(
    { search: "ada", email: "ada@example.com", role: "customer", orderBy: "name", order: "desc" },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("search"), "ada");
  assertEquals(p.get("email"), "ada@example.com");
  assertEquals(p.get("role"), "customer");
  assertEquals(p.get("orderby"), "name");
  assertEquals(p.get("order"), "desc");
});

test("customer-get-many: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute!({}, ctx);
  const p = new URL(calls[0].url).searchParams;
  assert(!p.has("search"));
  assert(!p.has("email"));
  assert(!p.has("role"));
});
