import { assert, assertEquals, assertRejects } from "@std/assert";
import emailInboxKnowledgeList from "../../actions/email-inbox-knowledge-list.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "emailInboxId": "p-1" };
const run = (
  ctx: Parameters<typeof emailInboxKnowledgeList.execute>[1],
  input: Record<string, unknown> = sample,
) => emailInboxKnowledgeList.execute(input as never, ctx) as Promise<unknown>;

Deno.test("email-inbox-knowledge-list: declares a read action with a description, params and output", () => {
  assertEquals(emailInboxKnowledgeList.key, "email-inbox-knowledge-list");
  assertEquals(emailInboxKnowledgeList.type, "read");
  assert((emailInboxKnowledgeList.description ?? "").length > 0);
  assert(
    Array.isArray(emailInboxKnowledgeList.output) && emailInboxKnowledgeList.output.length > 0,
  );
});

Deno.test("email-inbox-knowledge-list: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "items": [{ "id": "k1" }], "total": 1, "has_more": false } },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "id": "k1" }],
    "total": 1,
    "hasMore": false,
    "nextCursor": null,
    "count": 1,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/email-inbox/p-1/knowledge");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("email-inbox-knowledge-list: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
