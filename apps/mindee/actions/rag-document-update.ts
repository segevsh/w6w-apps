import type { ActionDefinition } from "@w6w/types";
import { asOptionalJsonValue, compact, MindeeClient } from "../lib/client.ts";

interface Input {
  documentId: string;
  status?: "Active" | "Inactive";
  annotation?: string;
}

/**
 * `PATCH /v2/products/extraction/rag-documents/{document_id}` — activate or
 * deactivate a RAG document, and/or set its field-level annotation.
 *
 * Per the vendor's own description: "annotation and status may be sent
 * together; annotation is applied first, then status. Activating a document
 * is asynchronous (the document stays Processing until embeddings are
 * ready)." `annotation` is a nested field-schema configuration object, passed
 * through as raw JSON here rather than modeled field-by-field, matching how
 * `extraction-enqueue`'s `dataSchema` override is handled.
 */
const ragDocumentUpdate: ActionDefinition<Input> = {
  key: "rag-document-update",
  type: "perform",
  resource: "rag-document",
  title: "Update RAG Document",
  description: "Activate/deactivate a RAG document and/or set its annotation.",
  idempotent: true,
  params: [
    { key: "documentId", label: "RAG document ID", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
      ],
    },
    {
      key: "annotation",
      label: "Annotation (JSON)",
      type: "json",
      advanced: true,
      hint: "Field-level RAG annotation/guidelines configuration for this document.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "RAG document ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json(
      `/v2/products/extraction/rag-documents/${encodeURIComponent(input.documentId)}`,
      {
        method: "PATCH",
        json: compact({
          status: input.status,
          annotation: asOptionalJsonValue(input.annotation, "Annotation"),
        }),
      },
    );
  },
};

export default ragDocumentUpdate;
