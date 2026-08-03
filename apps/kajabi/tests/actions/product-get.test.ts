import { assertEquals } from "@std/assert";
import productGet from "../../actions/product-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await productGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/products/7");
});

Deno.test("product-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await productGet.execute({ id: "7", fields: "title" }, ctx);
  assertEquals(queryOf(calls[0])["fields[products]"], "title");
});

Deno.test("product-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await productGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/products/a%2Fb");
});
