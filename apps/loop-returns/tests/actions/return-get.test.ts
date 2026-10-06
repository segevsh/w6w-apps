import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/return-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "returnId": 37603922, "currencyType": "shop" } as Record<string, unknown>;
const RESPONSE: unknown = { "id": 37603922, "state": "open" };
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("return-get: GET /warehouse/return/details", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/warehouse/return/details");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), { "return_id": "37603922", "currency_type": "shop" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out, { "id": 37603922, "state": "open" });
});

Deno.test("return-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("return-get: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});

Deno.test("return-get: refuses a call with no identifier before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute({} as never, ctx)) as Error;
  assert(err.message.includes("return ID"));
  assertEquals(calls.length, 0);
});

Deno.test("return-get: HTTP 200 'No return found' is a failure", async () => {
  const { ctx } = mockCtx([{ body: { error: { message: "No return found with this ID." } } }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("No return found"));
});
