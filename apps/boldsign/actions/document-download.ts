import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  format?: "Combined" | "Individually";
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
 * `GET /v1/document/download` — the document's completed PDF (or a ZIP when
 * multiple original files were combined and `format=Individually` is used).
 * The response is bytes, not JSON, so it is base64-encoded into a string with
 * its transport content type reported alongside — the same shape `signnow`,
 * `docusign` and `dropbox-sign` already use in this pack for a file-shaped
 * response crossing the worker boundary.
 */
const documentDownload: ActionDefinition<Input, Output> = {
  key: "document-download",
  type: "read",
  resource: "document",
  title: "Download Document",
  description: "Download a document's PDF, base64-encoded.",
  params: [
    documentIdParam,
    {
      key: "format",
      label: "Format",
      type: "select",
      options: [
        { value: "Combined", label: "Combined (single PDF)" },
        { value: "Individually", label: "Individually (original files kept separate)" },
      ],
      hint: "Only matters when the document was sent as more than one file.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "Document bytes, base64-encoded" },
    { key: "encoding", type: "string", label: "Encoding — always `base64`" },
    { key: "contentType", type: "string", label: "Transport content type" },
  ],

  async execute(input, ctx) {
    const res = await new BoldSignClient(ctx).request<Response>("/document/download", {
      raw: true,
      headers: { accept: "*/*" },
      query: { documentId: input.documentId, format: input.format },
    });
    const buf = new Uint8Array(await res.arrayBuffer());
    return {
      content: encodeBase64(buf),
      encoding: "base64",
      contentType: res.headers.get("content-type") ?? "application/pdf",
    };
  },
};

export default documentDownload;
