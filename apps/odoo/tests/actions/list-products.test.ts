import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-products.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("list-products: is a search action over product.product, the VARIANT model", () => {
  assertEquals(action.key, "list-products");
  assertEquals(action.type, "search");
  // Order lines reference product.product, not product.template — picking the
  // template here would hand callers ids that sales orders reject.
  assertEquals(action.resource, "product.product");
});

Deno.test("list-products: search_reads product.product", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 61 }] }]);
  await action.execute({ fields: "name,list_price", limit: 20 }, ctx);
  assertEquals(executeKwArgs(calls[0]), {
    model: "product.product",
    method: "search_read",
    args: [],
    kwargs: { domain: [], fields: ["name", "list_price"], limit: 20 },
  });
});

Deno.test("list-products: points at product.template for the catalogue-level record", () => {
  assert(/product\.template/.test(description(action)));
});
