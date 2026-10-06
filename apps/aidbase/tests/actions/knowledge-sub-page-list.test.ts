import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeSubPageList from "../../actions/knowledge-sub-page-list.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "knowledgeId": "k1" };
const run = (
  ctx: Parameters<typeof knowledgeSubPageList.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeSubPageList.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-sub-page-list: declares a read action with a description, params and output", () => {
  assertEquals(knowledgeSubPageList.key, "knowledge-sub-page-list");
  assertEquals(knowledgeSubPageList.type, "read");
  assert((knowledgeSubPageList.description ?? "").length > 0);
  assert(Array.isArray(knowledgeSubPageList.output) && knowledgeSubPageList.output.length > 0);
});

Deno.test("knowledge-sub-page-list: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "items": [{ "page_url": "/about" }, { "page_url": "/contact" }],
        "total": 12,
        "has_more": false,
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "page_url": "/about" }, { "page_url": "/contact" }],
    "total": 12,
    "hasMore": false,
    "nextCursor": null,
    "count": 2,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/k1/sub-pages");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-sub-page-list: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
