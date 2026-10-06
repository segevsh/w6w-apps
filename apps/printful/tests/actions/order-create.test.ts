import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/order-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("order-create: POST /orders and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": { "id": 5, "status": "draft" } },
  }]);
  const out = await action.execute!({
    "externalId": "o1",
    "recipient": '{"name":"Jo","country_code":"US"}',
    "items": '[{"variant_id":4011,"quantity":1}]',
    "confirm": false,
  }, ctx);
  assertEquals(out, { "id": 5, "status": "draft" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.printful.com/orders?confirm=false");
  assertEquals(JSON.parse(calls[0].body!), {
    "external_id": "o1",
    "recipient": { "name": "Jo", "country_code": "US" },
    "items": [{ "variant_id": 4011, "quantity": 1 }],
  });
});

Deno.test("order-create: a Printful error is surfaced with its reason and message", async () => {
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
        "externalId": "o1",
        "recipient": '{"name":"Jo","country_code":"US"}',
        "items": '[{"variant_id":4011,"quantity":1}]',
        "confirm": false,
      }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
