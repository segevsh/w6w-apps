import { assertEquals } from "@std/assert";
import action from "../../actions/get-product.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-product: GETs /stores/v3/products/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { product: { id: "p1" } } }]);
  await action.execute!({ productId: "p1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/stores/v3/products/p1");
  assertEquals(url.search, "");
});

Deno.test("get-product: repeats each requested field set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ productId: "p1", fields: "CURRENCY, MERCHANT_DATA" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.getAll("fields"),
    ["CURRENCY", "MERCHANT_DATA"],
  );
});

Deno.test("get-product: percent-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ productId: "a b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/stores/v3/products/a%20b");
});

Deno.test("get-product: is a read action", () => {
  assertEquals(action.type, "read");
});
