import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/order-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("order-get: GET /orders/%40o-1 and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": { "id": 5, "status": "draft" } },
  }]);
  const out = await action.execute!({ "orderId": "@o-1" }, ctx);
  assertEquals(out, { "id": 5, "status": "draft" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.printful.com/orders/%40o-1");
  assertEquals(calls[0].body, null);
});

Deno.test("order-get: a Printful error is surfaced with its reason and message", async () => {
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
    async () => await action.execute!({ "orderId": "@o-1" }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
