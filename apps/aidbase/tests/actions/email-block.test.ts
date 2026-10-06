import { assert, assertEquals, assertRejects } from "@std/assert";
import emailBlock from "../../actions/email-block.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "emailInboxId": "i1", "emailId": "e1" };
const run = (
  ctx: Parameters<typeof emailBlock.execute>[1],
  input: Record<string, unknown> = sample,
) => emailBlock.execute(input as never, ctx) as Promise<unknown>;

Deno.test("email-block: declares a perform action with a description, params and output", () => {
  assertEquals(emailBlock.key, "email-block");
  assertEquals(emailBlock.type, "perform");
  assert((emailBlock.description ?? "").length > 0);
  assert(Array.isArray(emailBlock.output) && emailBlock.output.length > 0);
  assertEquals(emailBlock.idempotent, true);
});

Deno.test("email-block: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "items": [{ "target": "e1", "targetType": "EMAIL", "status": "ACTIVE" }],
        "failed": [],
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "target": "e1", "targetType": "EMAIL", "status": "ACTIVE" }],
    "failed": [],
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/email-inbox/i1/emails/e1/block");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("email-block: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
