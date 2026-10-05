import { assertEquals, assertRejects } from "@std/assert";
import productGet from "../../actions/product-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "productId": 1337,
  "createdAtMin": "2025-01-16T14:30:00Z",
  "createdAtMax": "2025-01-31",
  "productStatus": "live",
  "productCategory": "digital",
  "pricingType": "one_time",
};
const RESPONSE = { "id": 1, "marker": true };

Deno.test("product-get: sends GET /v1/products/1337 with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await productGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/products/1337");
  assertEquals(queryOf(calls[0].url), {
    "created_at_min": "2025-01-16T14:30:00Z",
    "created_at_max": "2025-01-31",
    "status": "live",
    "product_category": "digital",
    "pricing_type": "one_time",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("product-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await productGet.execute(INPUT, ctx), { "id": 1, "marker": true });
});

Deno.test("product-get: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(() => Promise.resolve(productGet.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("product-get: a non-integer productId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        productGet.execute({ ...INPUT, productId: "1/../2" as unknown as number }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
