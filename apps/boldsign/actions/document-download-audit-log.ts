import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
}

interface Output {
  content: string;
  encoding: "base64";
  contentType: string;
}

/** base64 encode a byte array (no url-safe transformation). */
function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * `GET /v1/document/downloadAuditLog` — the signing audit trail (a PDF proof
 * of who viewed/signed, when, and from where) for a completed or in-progress
 * document. Response is bytes, not JSON — base64-encoded the same way
 * `document-download` is.
 */
const documentDownloadAuditLog: ActionDefinition<Input, Output> = {
  key: "document-download-audit-log",
  type: "read",
  resource: "document",
  title: "Download Audit Trail",
  description: "Download a document's signing audit trail as a PDF, base64-encoded.",
  params: [documentIdParam],
  output: [
    { key: "content", type: "string", label: "PDF bytes, base64-encoded" },
    { key: "encoding", type: "string", label: "Encoding — always `base64`" },
    { key: "contentType", type: "string", label: "Transport content type" },
  ],

  async execute(input, ctx) {
    const res = await new BoldSignClient(ctx).request<Response>("/document/downloadAuditLog", {
      raw: true,
      headers: { accept: "*/*" },
      query: { documentId: input.documentId },
    });
    const buf = new Uint8Array(await res.arrayBuffer());
    return {
      content: encodeBase64(buf),
      encoding: "base64",
      contentType: res.headers.get("content-type") ?? "application/pdf",
    };
  },
};

export default documentDownloadAuditLog;
