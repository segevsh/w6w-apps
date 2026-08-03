import { assert, assertEquals } from "@std/assert";
import action from "../../actions/get-product.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("get-product: is a read action over product.product", () => {
  assertEquals(action.key, "get-product");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "product.product");
});

Deno.test("get-product: read takes ids positionally", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 61 }] }]);
  await action.execute({ ids: 61, fields: "name" }, ctx);
  assertEquals(executeKwArgs(calls[0]), {
    model: "product.product",
    method: "read",
    args: [[61]],
    kwargs: { fields: ["name"] },
  });
});

Deno.test("get-product: warns that list_price is not the customer's price", () => {
  assert(/pricelist/i.test(description(action)));
});
