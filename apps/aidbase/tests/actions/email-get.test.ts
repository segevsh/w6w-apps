import { assert, assertEquals, assertRejects } from "@std/assert";
import emailGet from "../../actions/email-get.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "emailInboxId": "i1", "emailId": "e1" };
const run = (
  ctx: Parameters<typeof emailGet.execute>[1],
  input: Record<string, unknown> = sample,
) => emailGet.execute(input as never, ctx) as Promise<unknown>;

Deno.test("email-get: declares a read action with a description, params and output", () => {
  assertEquals(emailGet.key, "email-get");
  assertEquals(emailGet.type, "read");
  assert((emailGet.description ?? "").length > 0);
  assert(Array.isArray(emailGet.output) && emailGet.output.length > 0);
});

Deno.test("email-get: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "id": "e1", "subject": "Hi", "status": "open" } },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "e1", "subject": "Hi", "status": "open" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/email-inbox/i1/emails/e1");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("email-get: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
