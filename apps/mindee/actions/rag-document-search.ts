import type { ActionDefinition } from "@w6w/types";
import { compact, MindeeClient } from "../lib/client.ts";

interface Input {
  modelId: string;
  filename?: string;
  page?: number;
  perPage?: number;
}

/** `GET /v2/search/rag-documents` — `model_id` is required; other filters are optional. */
const ragDocumentSearch: ActionDefinition<Input> = {
  key: "rag-document-search",
  type: "search",
  resource: "rag-document",
  title: "Search RAG Documents",
  description: "List RAG documents uploaded against a given Extraction model.",
  params: [
    { key: "modelId", label: "Model ID", type: "string", required: true },
    {
      key: "filename",
      label: "Filename contains",
      type: "string",
      hint: "Case-insensitive partial match.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 100 },
    },
  ],
  output: [
    { key: "rag_documents", type: "array", label: "RAG documents" },
    { key: "pagination", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json("/v2/search/rag-documents", {
      query: compact({
        model_id: input.modelId,
        filename: input.filename,
        page: input.page,
        per_page: input.perPage,
      }),
    });
  },
};

export default ragDocumentSearch;
