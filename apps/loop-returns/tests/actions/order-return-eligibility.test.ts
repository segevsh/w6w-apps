import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/order-return-eligibility.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "orderName": "1001" } as Record<string, unknown>;
const RESPONSE: unknown = {
  "return_eligibility": { "order_id": 1, "as_of": "x", "advisory": false, "items": [] },
};
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("order-return-eligibility: POST /orders/return-eligibility", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/orders/return-eligibility");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "order_name": "1001" });
  assertEquals(out, {
    "return_eligibility": { "order_id": 1, "as_of": "x", "advisory": false, "items": [] },
  });
});

Deno.test("order-return-eligibility: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("order-return-eligibility: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});
