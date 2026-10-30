import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import ragDocumentGet from "../../actions/rag-document-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("rag-document-get: fetches one RAG document by id", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "doc1", status: "Active", total_matches: 3 } },
  ]);
  const result = await ragDocumentGet.execute({ documentId: "doc1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/products/extraction/rag-documents/doc1");
  assertEquals((result as { total_matches: number }).total_matches, 3);
});
