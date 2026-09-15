import { assertEquals } from "@std/assert";
import ragDocumentSearch from "../../actions/rag-document-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const MODEL_ID = "018f1e2a-0000-7000-8000-0000000000aa";

Deno.test("rag-document-search: requires model_id, filters map to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: { rag_documents: [], pagination: {} } }]);
  await ragDocumentSearch.execute(
    { modelId: MODEL_ID, filename: "ref", page: 1, perPage: 25 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/search/rag-documents");
  assertEquals(queryOf(calls[0].url), {
    model_id: MODEL_ID,
    filename: "ref",
    page: "1",
    per_page: "25",
  });
});
