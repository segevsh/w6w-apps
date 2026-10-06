import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/catalog-product-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("catalog-product-list: GET /products and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": 200, "result": [{ "id": 71 }] } }]);
  const out = await action.execute!({ "categoryId": "24,55" }, ctx);
  assertEquals(out, { "products": [{ "id": 71 }] });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.printful.com/products?category_id=24%2C55");
  assertEquals(calls[0].body, null);
});

Deno.test("catalog-product-list: a Printful error is surfaced with its reason and message", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { "content-type": "application/json", "x-ratelimit-reset": "30" },
    body: {
      code: 429,
      result: "Too many requests",
      error: { reason: "Too Many Requests", message: "slow down" },
    },
  }]);
  await assertRejects(
    async () => await action.execute!({ "categoryId": "24,55" }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
