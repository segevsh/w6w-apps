import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/catalog-size-guide-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("catalog-size-guide-get: GET /products/71/sizes and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "code": 200,
      "result": { "product_id": 71, "available_sizes": ["S"], "size_tables": [] },
    },
  }]);
  const out = await action.execute!({ "productId": 71, "unit": "cm" }, ctx);
  assertEquals(out, { "product_id": 71, "available_sizes": ["S"], "size_tables": [] });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.printful.com/products/71/sizes?unit=cm");
  assertEquals(calls[0].body, null);
});

Deno.test("catalog-size-guide-get: a Printful error is surfaced with its reason and message", async () => {
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
    async () => await action.execute!({ "productId": 71, "unit": "cm" }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
