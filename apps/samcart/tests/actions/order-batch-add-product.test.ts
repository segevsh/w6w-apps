import { assertEquals, assertRejects } from "@std/assert";
import orderBatchAddProduct from "../../actions/order-batch-add-product.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "orderIds": "12345, 12346", "productIds": "678,679" };
const RESPONSE = { "success": "true", "data": "ok" };

Deno.test("order-batch-add-product: sends POST /v1/orders/batch-add-to-order with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await orderBatchAddProduct.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/orders/batch-add-to-order");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "order_ids": [12345, 12346],
    "product_ids": [678, 679],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("order-batch-add-product: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await orderBatchAddProduct.execute(INPUT, ctx), {
    "response": { "success": "true", "data": "ok" },
  });
});

Deno.test("order-batch-add-product: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(orderBatchAddProduct.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});
