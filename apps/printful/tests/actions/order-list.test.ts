import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/order-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("order-list: GET /orders and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "code": 200,
      "result": [{ "id": 1 }],
      "paging": { "total": 30, "offset": 0, "limit": 5 },
    },
  }]);
  const out = await action.execute!({ "status": "draft", "limit": 2 }, ctx);
  assertEquals(out, {
    "orders": [{ "id": 1 }],
    "paging": { "total": 30, "offset": 0, "limit": 5 },
  });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.printful.com/orders?status=draft&limit=2");
  assertEquals(calls[0].body, null);
});

Deno.test("order-list: a Printful error is surfaced with its reason and message", async () => {
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
    async () => await action.execute!({ "status": "draft", "limit": 2 }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
