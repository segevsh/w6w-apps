import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/return-cancel.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "returnId": 42 } as Record<string, unknown>;
const RESPONSE: unknown = true;
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("return-cancel: POST /warehouse/return/42/cancel", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/warehouse/return/42/cancel");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out, { "success": true, "returnId": 42 });
});

Deno.test("return-cancel: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("return-cancel: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});

Deno.test("return-cancel: an HTTP 200 carrying an error body is still a failure", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { "errors": { "message": "No return found with this ID." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("refused the request"));
});

Deno.test("return-cancel: a body of false is not success", async () => {
  const { ctx } = mockCtx([{ body: false }]);
  assertEquals(await run(ctx), { success: false, returnId: 42 });
});
