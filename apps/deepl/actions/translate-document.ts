import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, dataUrlMime, DeepLClient } from "../lib/client.ts";

interface Input {
  file: string;
  filename: string;
  mimeType?: string;
  targetLang: string;
  sourceLang?: string;
  outputFormat?: string;
  formality?: "default" | "more" | "less" | "prefer_more" | "prefer_less";
  glossaryId?: string;
}

interface UploadResponse {
  document_id: string;
  document_key: string;
}

interface Output {
  documentId: string;
  documentKey: string;
}

/**
 * `POST /v2/document` — upload a document for translation. This only submits
 * the job: DeepL translates documents asynchronously (large files can take
 * minutes), so polling to completion belongs in the workflow, not inside a
 * single blocking `execute`. Pair this with `document-status` (poll) and
 * `document-download` (fetch the result) as separate steps.
 */
const translateDocument: ActionDefinition<Input, Output> = {
  key: "translate-document",
  type: "perform",
  resource: "document",
  title: "Translate Document",
  description: "Upload a document to DeepL for translation. Returns a job to poll and download.",
  idempotent: false,
  params: [
    {
      key: "file",
      label: "File (base64)",
      type: "file",
      required: true,
      hint: "A `data:<mime>;base64,...` URL, or bare base64 + MIME type below.",
    },
    { key: "filename", label: "File name", type: "string", required: true },
    {
      key: "mimeType",
      label: "MIME type",
      type: "string",
      placeholder: "application/pdf",
      hint: "Only needed when File isn't a `data:` URL.",
    },
    {
      key: "targetLang",
      label: "Target Language",
      type: "string",
      required: true,
      hint: "Language code, e.g. DE, EN-US, FR. See the List Languages action for valid codes.",
    },
    { key: "sourceLang", label: "Source Language", type: "string", hint: "Omit to auto-detect." },
    {
      key: "outputFormat",
      label: "Output Format",
      type: "string",
      hint: "e.g. docx, pdf. Defaults to the input format.",
    },
    {
      key: "formality",
      label: "Formality",
      type: "select",
      options: [
        { value: "default", label: "Default" },
        { value: "more", label: "More formal" },
        { value: "less", label: "Less formal" },
        { value: "prefer_more", label: "Prefer more formal" },
        { value: "prefer_less", label: "Prefer less formal" },
      ],
    },
    { key: "glossaryId", label: "Glossary ID", type: "string" },
  ],
  output: [
    { key: "documentId", type: "string", label: "Document ID" },
    { key: "documentKey", type: "string", label: "Document encryption key" },
  ],

  async execute(input, ctx) {
    const client = new DeepLClient(ctx);
    const mimeType = dataUrlMime(input.file) ?? input.mimeType ?? "application/octet-stream";
    const bytes = base64ToBytes(input.file);

    const form = new FormData();
    form.append("target_lang", input.targetLang);
    if (input.sourceLang) form.append("source_lang", input.sourceLang);
    if (input.outputFormat) form.append("output_format", input.outputFormat);
    if (input.formality) form.append("formality", input.formality);
    if (input.glossaryId) form.append("glossary_id", input.glossaryId);
    form.append(
      "file",
      new Blob([new Uint8Array(bytes).buffer], { type: mimeType }),
      input.filename,
    );

    const res = await client.request<UploadResponse>("/v2/document", { method: "POST", form });
    return { documentId: res.document_id, documentKey: res.document_key };
  },
};

export default translateDocument;
