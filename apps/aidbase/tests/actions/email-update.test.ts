import { assert, assertEquals, assertRejects } from "@std/assert";
import emailUpdate from "../../actions/email-update.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "emailInboxId": "i1", "emailId": "e1", "status": "resolved" };
const run = (
  ctx: Parameters<typeof emailUpdate.execute>[1],
  input: Record<string, unknown> = sample,
) => emailUpdate.execute(input as never, ctx) as Promise<unknown>;

Deno.test("email-update: declares a perform action with a description, params and output", () => {
  assertEquals(emailUpdate.key, "email-update");
  assertEquals(emailUpdate.type, "perform");
  assert((emailUpdate.description ?? "").length > 0);
  assert(Array.isArray(emailUpdate.output) && emailUpdate.output.length > 0);
  assertEquals(emailUpdate.idempotent, true);
});

Deno.test("email-update: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  const out = await run(ctx);
  assertEquals(out, { "ok": true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/email-inbox/i1/emails/e1");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "status": "resolved" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("email-update: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});

Deno.test("email-update: refuses an empty update without calling Aidbase", async () => {
  const { ctx, calls } = mockCtx([]);
  const input = { "emailInboxId": "i1", "emailId": "e1" };
  await assertRejects(() => run(ctx, input), Error, "at least one");
  assertEquals(calls.length, 0);
});
