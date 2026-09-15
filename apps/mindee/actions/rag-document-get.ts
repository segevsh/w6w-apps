import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";

interface Input {
  documentId: string;
}

/** `GET /v2/products/extraction/rag-documents/{document_id}`. */
const ragDocumentGet: ActionDefinition<Input> = {
  key: "rag-document-get",
  type: "read",
  resource: "rag-document",
  title: "Get RAG Document",
  description: "Fetch metadata for one uploaded RAG document.",
  params: [
    { key: "documentId", label: "RAG document ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "RAG document ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "total_matches", type: "number", label: "Times used in an inference" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json(
      `/v2/products/extraction/rag-documents/${encodeURIComponent(input.documentId)}`,
    );
  },
};

export default ragDocumentGet;
