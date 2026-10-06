import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/fraud-report-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "returnId": 42, "category": "item-is-worn", "comment": "stained" } as Record<
  string,
  unknown
>;
const RESPONSE: unknown = {
  "id": 9,
  "return_id": 42,
  "category": "item-is-worn",
  "comment": "stained",
  "created_at": "2026",
};
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("fraud-report-create: POST /returns/42/fraud-report", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/returns/42/fraud-report");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "category": "item-is-worn", "comment": "stained" });
  assertEquals(out, {
    "id": 9,
    "return_id": 42,
    "category": "item-is-worn",
    "comment": "stained",
    "created_at": "2026",
  });
});

Deno.test("fraud-report-create: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("fraud-report-create: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});
