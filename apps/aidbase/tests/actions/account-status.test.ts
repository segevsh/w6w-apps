import { assert, assertEquals, assertRejects } from "@std/assert";
import accountStatus from "../../actions/account-status.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {};
const run = (
  ctx: Parameters<typeof accountStatus.execute>[1],
  input: Record<string, unknown> = sample,
) => accountStatus.execute(input as never, ctx) as Promise<unknown>;

Deno.test("account-status: declares a read action with a description, params and output", () => {
  assertEquals(accountStatus.key, "account-status");
  assertEquals(accountStatus.type, "read");
  assert((accountStatus.description ?? "").length > 0);
  assert(Array.isArray(accountStatus.output) && accountStatus.output.length > 0);
});

Deno.test("account-status: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "status": "ok", "token": "absk-........a3d0" } },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "status": "ok" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/status");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("account-status: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
