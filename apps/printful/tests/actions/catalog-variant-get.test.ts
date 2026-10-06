import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/catalog-variant-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("catalog-variant-get: GET /products/variant/4011 and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": { "variant": { "id": 4011 }, "product": { "id": 71 } } },
  }]);
  const out = await action.execute!({ "variantId": 4011 }, ctx);
  assertEquals(out, { "variant": { "id": 4011 }, "product": { "id": 71 } });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.printful.com/products/variant/4011");
  assertEquals(calls[0].body, null);
});

Deno.test("catalog-variant-get: a Printful error is surfaced with its reason and message", async () => {
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
    async () => await action.execute!({ "variantId": 4011 }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
