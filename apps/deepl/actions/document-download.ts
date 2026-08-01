import type { ActionDefinition } from "@w6w/types";
import { bytesToBase64, DeepLClient } from "../lib/client.ts";

interface Input {
  documentId: string;
  documentKey: string;
}

interface Output {
  fileBase64: string;
  contentType: string;
}

/**
 * `POST /v2/document/{document_id}/result` — download a finished
 * translation. The response is raw `application/octet-stream` bytes (no JSON
 * wrapper), so this base64-encodes the body so binary content survives JSON
 * serialization crossing the sandbox boundary — the same convention this
 * pack's `box`/`dropbox` download actions use. Only call this once
 * `document-status` reports `"done"`.
 */
const documentDownload: ActionDefinition<Input, Output> = {
  key: "document-download",
  type: "read",
  resource: "document",
  title: "Download Translated Document",
  description: "Download the translated file for a completed document job.",
  params: [
    { key: "documentId", label: "Document ID", type: "string", required: true },
    { key: "documentKey", label: "Document Key", type: "string", required: true },
  ],
  output: [
    { key: "fileBase64", type: "string", label: "File contents (base64)" },
    { key: "contentType", type: "string", label: "Content type" },
  ],

  async execute(input, ctx) {
    const client = new DeepLClient(ctx);
    const res = await client.request<Response>(`/v2/document/${input.documentId}/result`, {
      method: "POST",
      body: { document_key: input.documentKey },
      raw: true,
    });
    const bytes = new Uint8Array(await res.arrayBuffer());
    return {
      fileBase64: bytesToBase64(bytes),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  },
};

export default documentDownload;
