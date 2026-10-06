import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/webhook-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-get: GET /webhooks and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": { "url": "https://x", "types": ["package_shipped"] } },
  }]);
  const out = await action.execute!({}, ctx);
  assertEquals(out, { "url": "https://x", "types": ["package_shipped"] });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.printful.com/webhooks");
  assertEquals(calls[0].body, null);
});

Deno.test("webhook-get: a Printful error is surfaced with its reason and message", async () => {
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
    async () => await action.execute!({}, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
