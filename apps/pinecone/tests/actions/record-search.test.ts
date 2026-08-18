import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-search.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

/** snake_case here, camelCase on /query — Pinecone's own inconsistency. */
Deno.test("record-search: sends snake_case top_k and the text query", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: { result: { hits: [] } } }]);
  await action.execute!({ indexName: "idx", namespace: "docs", query: "how do I…", topK: 20 }, ctx);
  const sent = JSON.parse(calls[1].body!);
  assertEquals(sent.query.top_k, 20);
  assertEquals(sent.query.inputs, { text: "how do I…" });
  assertEquals(new URL(calls[1].url).pathname, "/records/namespaces/docs/search");
});

Deno.test("record-search: reranking is off unless a model is named", async () => {
  const off = mockCtx([describe, { status: 200, body: {} }]);
  await action.execute!({ indexName: "idx", query: "x" }, off.ctx);
  assertEquals("rerank" in JSON.parse(off.calls[1].body!), false);

  const on = mockCtx([describe, { status: 200, body: {} }]);
  await action.execute!({
    indexName: "idx",
    query: "x",
    topK: 50,
    rerankModel: "bge-reranker-v2-m3",
    rerankFields: "chunk_text",
    topN: 5,
  }, on.ctx);
  const sent = JSON.parse(on.calls[1].body!);
  assertEquals(sent.rerank, {
    model: "bge-reranker-v2-m3",
    rank_fields: ["chunk_text"],
    top_n: 5,
  });
});

Deno.test("record-search: an empty query is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", query: " " }, ctx),
    Error,
    "query",
  );
  assertEquals(calls.length, 0);
});

/** Pinecone's rerank default is `text`, which is wrong for most field maps. */
Deno.test("record-search: the rerank-fields hint warns about the default", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "rerankFields")!;
  assert(/defaults to `text`|defaults to .text./.test(p.hint!), p.hint);
});
