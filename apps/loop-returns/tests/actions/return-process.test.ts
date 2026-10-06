import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/return-process.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "returnId": 42, "additionalDetails": '{"warehouse":"A"}' } as Record<
  string,
  unknown
>;
const RESPONSE: unknown = true;
const run = (ctx: Parameters<typeof action.execute>[1]) => action.execute(INPUT as never, ctx);

Deno.test("return-process: POST /warehouse/return/42/process", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await run(ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/warehouse/return/42/process");
  assert(calls[0].url.startsWith("https://api.loopreturns.com/api/v1/"));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "warehouse": "A" });
  assertEquals(out, { "success": true, "returnId": 42 });
});

Deno.test("return-process: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await run(ctx);
  assertEquals(calls[0].headers["x-authorization"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("return-process: an HTTP error surfaces Loop's own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("HTTP 401"));
  assert(err.message.includes("GEN-UNAUTHORIZED: Unauthorized."));
});

Deno.test("return-process: an HTTP 200 carrying an error body is still a failure", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      "errors": {
        "message": "Return is open and therefore cannot be processed.",
        "code": "UNPROCESSABLE_FLAGGED_RETURN",
      },
    },
  }]);
  const err = await assertRejects(async () => await run(ctx)) as Error;
  assert(err.message.includes("refused the request"));
});

Deno.test("return-process: no payload sends no body; a non-object payload is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: true }]);
  await action.execute({ returnId: 42 } as never, ctx);
  assertEquals(calls[0].body, null);
  const err = await assertRejects(async () =>
    await action.execute({ returnId: 42, additionalDetails: "[1]" } as never, mockCtx([]).ctx)
  ) as Error;
  assert(err.message.includes("additionalDetails"));
});
