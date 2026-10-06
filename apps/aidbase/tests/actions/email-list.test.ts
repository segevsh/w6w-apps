import { assert, assertEquals, assertRejects } from "@std/assert";
import emailList from "../../actions/email-list.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "emailInboxId": "i1", "status": "open,resolved", "createdBefore": "2026-02-01" };
const run = (
  ctx: Parameters<typeof emailList.execute>[1],
  input: Record<string, unknown> = sample,
) => emailList.execute(input as never, ctx) as Promise<unknown>;

Deno.test("email-list: declares a read action with a description, params and output", () => {
  assertEquals(emailList.key, "email-list");
  assertEquals(emailList.type, "read");
  assert((emailList.description ?? "").length > 0);
  assert(Array.isArray(emailList.output) && emailList.output.length > 0);
});

Deno.test("email-list: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "items": [{ "id": "e1", "subject": "Hi" }],
        "total": 320,
        "has_more": true,
        "next_cursor": "n",
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "id": "e1", "subject": "Hi" }],
    "total": 320,
    "hasMore": true,
    "nextCursor": "n",
    "count": 1,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/email-inbox/i1/emails");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {
    "status": "open,resolved",
    "created_before": "2026-02-01",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("email-list: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
