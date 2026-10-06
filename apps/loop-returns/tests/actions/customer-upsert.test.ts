import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-upsert.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "externalId": "c-1",
  "salesChannel": "shopify",
  "firstName": "Ada",
  "tags": "vip, eu",
} as Record<string, unknown>;
const RESPONSE: unknown = { "customer": { "id": 3, "external_id": "c-1" } };
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("customer-upsert: PUT /customers", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v1/customers");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "external_id": "c-1",
    "sales_channel": "shopify",
    "first_name": "Ada",
    "tags": ["vip", "eu"],
  });
  assertEquals(out, { "customer": { "id": 3, "external_id": "c-1" } });
});

Deno.test("customer-upsert: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("customer-upsert: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});
