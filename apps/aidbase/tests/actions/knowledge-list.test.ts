import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeList from "../../actions/knowledge-list.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "limit": 2, "nextCursor": "abc" };
const run = (
  ctx: Parameters<typeof knowledgeList.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeList.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-list: declares a read action with a description, params and output", () => {
  assertEquals(knowledgeList.key, "knowledge-list");
  assertEquals(knowledgeList.type, "read");
  assert((knowledgeList.description ?? "").length > 0);
  assert(Array.isArray(knowledgeList.output) && knowledgeList.output.length > 0);
});

Deno.test("knowledge-list: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "items": [{ "id": "k1", "type": "website" }],
        "total": 40,
        "has_more": true,
        "next_cursor": "MjUuNTA=",
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "id": "k1", "type": "website" }],
    "total": 40,
    "hasMore": true,
    "nextCursor": "MjUuNTA=",
    "count": 1,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), { "limit": "2", "next_cursor": "abc" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-list: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
