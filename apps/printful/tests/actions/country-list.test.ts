import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/country-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("country-list: GET /countries and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": [{ "code": "AU", "name": "Australia" }] },
  }]);
  const out = await action.execute!({}, ctx);
  assertEquals(out, { "countries": [{ "code": "AU", "name": "Australia" }] });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.printful.com/countries");
  assertEquals(calls[0].body, null);
});

Deno.test("country-list: a Printful error is surfaced with its reason and message", async () => {
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
