import type { ActionDefinition } from "@w6w/types";
import { BoxClient } from "../lib/client.ts";

interface Input {
  fileId: string;
  /** When true (default) decode the response body as UTF-8 text. */
  asText?: boolean;
}

interface Output {
  content: string;
  encoding: "utf-8" | "base64";
}

/** base64 encode a byte array (no url-safe transformation). */
function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * Download a file's contents. Box answers this endpoint with a `302`
 * redirect to a `dl*.boxcloud.com` host carrying the actual bytes — the
 * redirect is followed transparently by the host's fetch on this app's
 * behalf, so this action only ever sees the final response (see
 * `../lib/client.ts` for why that host needs no separate allowlist entry).
 *
 * https://developer.box.com/reference/get-files-id-content/
 */
const downloadFile: ActionDefinition<Input, Output> = {
  key: "download-file",
  type: "read",
  resource: "file",
  title: "Download File",
  description: "Download a file's contents from Box.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
    {
      key: "asText",
      label: "Return as UTF-8 text",
      type: "boolean",
      default: true,
      hint: "When off, the file is base64-encoded so binary content survives JSON serialization.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "File contents" },
    { key: "encoding", type: "string", label: "Encoding (utf-8 or base64)" },
  ],

  async execute(input, ctx) {
    const client = new BoxClient(ctx);
    const res = await client.request<Response>(`/files/${input.fileId}/content`, { raw: true });

    const asText = input.asText ?? true;
    if (asText) {
      const content = await res.text();
      return { content, encoding: "utf-8" };
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    return { content: encodeBase64(buf), encoding: "base64" };
  },
};

export default downloadFile;
