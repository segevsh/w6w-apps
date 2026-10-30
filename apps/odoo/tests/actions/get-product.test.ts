import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import action from "../../actions/get-product.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

test("get-product: is a read action over product.product", () => {
  assertEquals(action.key, "get-product");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "product.product");
});

test("get-product: read takes ids positionally", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 61 }] }]);
  await action.execute({ ids: 61, fields: "name" }, ctx);
  assertEquals(executeKwArgs(calls[0]), {
    model: "product.product",
    method: "read",
    args: [[61]],
    kwargs: { fields: ["name"] },
  });
});

test("get-product: warns that list_price is not the customer's price", () => {
  assert(/pricelist/i.test(description(action)));
});
