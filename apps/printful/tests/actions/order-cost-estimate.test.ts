import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/order-cost-estimate.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("order-cost-estimate: POST /orders/estimate-costs and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": { "costs": { "total": "9.00" }, "retail_costs": {} } },
  }]);
  const out = await action.execute!({
    "recipient": { "country_code": "US" },
    "items": [{ "variant_id": 1, "quantity": 1 }],
  }, ctx);
  assertEquals(out, { "costs": { "total": "9.00" }, "retail_costs": {} });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.printful.com/orders/estimate-costs");
  assertEquals(JSON.parse(calls[0].body!), {
    "recipient": { "country_code": "US" },
    "items": [{ "variant_id": 1, "quantity": 1 }],
  });
});

Deno.test("order-cost-estimate: a Printful error is surfaced with its reason and message", async () => {
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
    async () =>
      await action.execute!({
        "recipient": { "country_code": "US" },
        "items": [{ "variant_id": 1, "quantity": 1 }],
      }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
