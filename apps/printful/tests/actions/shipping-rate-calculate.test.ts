import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/shipping-rate-calculate.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("shipping-rate-calculate: POST /shipping/rates and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": [{ "id": "STANDARD", "rate": "4.99" }] },
  }]);
  const out = await action.execute!({
    "recipient": { "country_code": "US" },
    "items": [{ "variant_id": 1, "quantity": 1 }],
    "currency": "USD",
  }, ctx);
  assertEquals(out, { "rates": [{ "id": "STANDARD", "rate": "4.99" }] });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.printful.com/shipping/rates");
  assertEquals(JSON.parse(calls[0].body!), {
    "recipient": { "country_code": "US" },
    "items": [{ "variant_id": 1, "quantity": 1 }],
    "currency": "USD",
  });
});

Deno.test("shipping-rate-calculate: a Printful error is surfaced with its reason and message", async () => {
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
        "currency": "USD",
      }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
