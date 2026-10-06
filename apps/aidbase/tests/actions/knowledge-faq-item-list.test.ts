import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeFaqItemList from "../../actions/knowledge-faq-item-list.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "knowledgeId": "f1", "limit": 5 };
const run = (
  ctx: Parameters<typeof knowledgeFaqItemList.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeFaqItemList.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-faq-item-list: declares a read action with a description, params and output", () => {
  assertEquals(knowledgeFaqItemList.key, "knowledge-faq-item-list");
  assertEquals(knowledgeFaqItemList.type, "read");
  assert((knowledgeFaqItemList.description ?? "").length > 0);
  assert(Array.isArray(knowledgeFaqItemList.output) && knowledgeFaqItemList.output.length > 0);
});

Deno.test("knowledge-faq-item-list: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "items": [{ "id": "q1", "question": "Open?" }],
        "total": 8,
        "has_more": true,
        "next_cursor": "c2",
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "id": "q1", "question": "Open?" }],
    "total": 8,
    "hasMore": true,
    "nextCursor": "c2",
    "count": 1,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/f1/faq-items");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), { "limit": "5" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-faq-item-list: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
