import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-get-by-external-id.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "externalId": "ext-7" } as Record<string, unknown>;
const RESPONSE: unknown = { "customer": { "id": 7 } };
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("customer-get-by-external-id: GET /customers/external/ext-7", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/customers/external/ext-7");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out, { "customer": { "id": 7 } });
});

Deno.test("customer-get-by-external-id: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("customer-get-by-external-id: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});
