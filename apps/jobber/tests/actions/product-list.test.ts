import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-list.ts";

Deno.test("product-list: the filter takes category as a LIST", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { products: { nodes: [] } } } }]);
  await action.execute({ category: "SERVICE" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, { category: ["SERVICE"] });
});

Deno.test("product-list: showInactive defaults to Jobber's own false, explicitly", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { products: { nodes: [] } } } }]);
  await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { showInactive: false, first: 50 });
});

Deno.test("product-list: queries `products`, whatever the mutations are called", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { products: { nodes: [] } } } }]);
  await action.execute({}, ctx);
  assert(JSON.parse(calls[0].body!).query.includes("products("));
});
