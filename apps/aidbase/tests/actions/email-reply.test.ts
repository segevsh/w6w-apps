import { assert, assertEquals, assertRejects } from "@std/assert";
import emailReply from "../../actions/email-reply.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "emailInboxId": "i1", "emailId": "e1", "message": "Thanks!" };
const run = (
  ctx: Parameters<typeof emailReply.execute>[1],
  input: Record<string, unknown> = sample,
) => emailReply.execute(input as never, ctx) as Promise<unknown>;

Deno.test("email-reply: declares a perform action with a description, params and output", () => {
  assertEquals(emailReply.key, "email-reply");
  assertEquals(emailReply.type, "perform");
  assert((emailReply.description ?? "").length > 0);
  assert(Array.isArray(emailReply.output) && emailReply.output.length > 0);
  assertEquals(emailReply.idempotent, false);
});

Deno.test("email-reply: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  const out = await run(ctx);
  assertEquals(out, { "ok": true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/email-inbox/i1/emails/e1/reply");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "message": "Thanks!" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("email-reply: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
