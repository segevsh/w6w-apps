import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rerank.ts";

Deno.test("rerank: sends the query, documents and rank fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute!({
    model: "bge-reranker-v2-m3",
    query: "capital of France",
    documents: '[{"id":"1","text":"Paris"}]',
    rankFields: "text",
    topN: 3,
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(new URL(calls[0].url).pathname, "/rerank");
  assertEquals(sent.rank_fields, ["text"]);
  assertEquals(sent.top_n, 3);
  assertEquals(sent.return_documents, true);
});

Deno.test("rerank: plain strings are wrapped as {text}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ model: "m", query: "q", documents: '["Paris","Lyon"]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).documents, [{ text: "Paris" }, { text: "Lyon" }]);
});

Deno.test("rerank: topN 0 means return everything, reordered", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ model: "m", query: "q", documents: '["a"]', topN: 0 }, ctx);
  assertEquals("top_n" in JSON.parse(calls[0].body!), false);
});

Deno.test("rerank: a query and documents are both required", async () => {
  const noQuery = mockCtx();
  await assertRejects(
    async () => await action.execute!({ model: "m", documents: '["a"]' }, noQuery.ctx),
    Error,
    "query",
  );
  const noDocs = mockCtx();
  await assertRejects(
    async () => await action.execute!({ model: "m", query: "q", documents: "[]" }, noDocs.ctx),
    Error,
    "documents",
  );
  assertEquals(noQuery.calls.length + noDocs.calls.length, 0);
});

/** It is not tied to Pinecone-stored data, and the description says so. */
Deno.test("rerank: says it works on any documents", () => {
  assert(/not just Pinecone/i.test(action.description!), action.description);
});
