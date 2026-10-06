import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/store-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("store-get: GET /stores/12 and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": { "id": 12, "name": "S", "type": "native" } },
  }]);
  const out = await action.execute!({ "storeId": "12" }, ctx);
  assertEquals(out, { "id": 12, "name": "S", "type": "native" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.printful.com/stores/12");
  assertEquals(calls[0].body, null);
});

Deno.test("store-get: a Printful error is surfaced with its reason and message", async () => {
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
    async () => await action.execute!({ "storeId": "12" }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
