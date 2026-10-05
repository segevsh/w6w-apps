import { assertEquals, assertRejects } from "@std/assert";
import orderAddProduct from "../../actions/order-add-product.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "orderId": 1337, "productId": 12345 };
const RESPONSE = { "success": "true", "data": "ok" };

Deno.test("order-add-product: sends POST /v1/orders/1337/add-to-order with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await orderAddProduct.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/orders/1337/add-to-order");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "product_id": 12345 });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("order-add-product: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await orderAddProduct.execute(INPUT, ctx), {
    "response": { "success": "true", "data": "ok" },
  });
});

Deno.test("order-add-product: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(orderAddProduct.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("order-add-product: a non-integer orderId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        orderAddProduct.execute({ ...INPUT, orderId: "1/../2" as unknown as number }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
