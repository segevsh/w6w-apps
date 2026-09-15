import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, MindeeClient } from "../lib/client.ts";

interface Input {
  modelId: string;
  file: string;
  fileName?: string;
  fileMimeType?: string;
}

/**
 * `POST /v2/products/extraction/rag-documents` — upload a reference document
 * for Retrieval-Augmented Generation, indexed against an Extraction model.
 * Once uploaded, an inference against the same model with `rag: true`
 * (`extraction-enqueue`) can match against it.
 *
 * Uploaded documents start `Processing` (embeddings not ready yet) — use
 * `rag-document-get` to check `status`, or `rag-document-update` to annotate
 * or activate/deactivate it once ready.
 *
 * Unlike the five product enqueue routes, this one takes ONLY a raw-bytes
 * `file` — no `url` or `file_base64` alternative is documented for RAG
 * uploads (`Body_Upload_RAG_Documents_for_Extraction_Product...` requires
 * exactly `model_id` and `file`), so this action does not expose a `url`
 * param the vendor would reject.
 */
const ragDocumentUpload: ActionDefinition<Input> = {
  key: "rag-document-upload",
  type: "perform",
  resource: "rag-document",
  title: "Upload RAG Document",
  description: "Upload a reference document for RAG-assisted extraction against a model.",
  idempotent: false,
  params: [
    { key: "modelId", label: "Model ID", type: "string", required: true },
    {
      key: "file",
      label: "File (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded document bytes.",
    },
    { key: "fileName", label: "File name", type: "string", default: "document.pdf" },
    { key: "fileMimeType", label: "File MIME type", type: "string", default: "application/pdf" },
  ],
  output: [
    { key: "id", type: "string", label: "RAG document ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const form = new FormData();
    form.append("model_id", input.modelId);
    form.append(
      "file",
      new Blob([base64ToBytes(input.file)], { type: input.fileMimeType || "application/pdf" }),
      input.fileName || "document.pdf",
    );
    return new MindeeClient(ctx).json("/v2/products/extraction/rag-documents", {
      method: "POST",
      form,
    });
  },
};

export default ragDocumentUpload;
