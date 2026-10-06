import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/sync-product-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sync-product-get: GET /store/products/%40abc and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": { "sync_product": { "id": 1 }, "sync_variants": [] } },
  }]);
  const out = await action.execute!({ "syncProductId": "@abc" }, ctx);
  assertEquals(out, { "sync_product": { "id": 1 }, "sync_variants": [] });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.printful.com/store/products/%40abc");
  assertEquals(calls[0].body, null);
});

Deno.test("sync-product-get: a Printful error is surfaced with its reason and message", async () => {
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
    async () => await action.execute!({ "syncProductId": "@abc" }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
