import type { ActionDefinition, FileRef } from "@w6w/types";
import { BoxClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

interface Output {
  file: FileRef;
}

/**
 * Extract a filename from a `Content-Disposition` header, if Box sent one.
 * Handles both the plain `filename="..."` form and the RFC 5987
 * `filename*=UTF-8''...` form; the latter takes precedence when both appear.
 */
function filenameFromContentDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  const extended = header.match(/filename\*\s*=\s*[^']*''([^;]+)/i);
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      return extended[1].trim();
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : undefined;
}

/**
 * Download a file's contents. Box answers this endpoint with a `302`
 * redirect to a `dl*.boxcloud.com` host carrying the actual bytes — the
 * redirect is followed transparently by the host's fetch on this app's
 * behalf, so this action only ever sees the final response (see
 * `../lib/client.ts` for why that host needs no separate allowlist entry).
 *
 * The response bytes are handed to the host's file store via `ctx.file`,
 * never inlined into the action's own output — a `FileRef` travels through
 * step output/params like any other value, but the bytes never do.
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
  ],
  output: [
    { key: "file", type: "file", label: "Downloaded file" },
  ],

  async execute(input, ctx) {
    if (!ctx.file) {
      throw new Error(
        "download-file requires the host to support file storage (ctx.file), " +
          "which this host does not provide.",
      );
    }
    const client = new BoxClient(ctx);
    const res = await client.request<Response>(`/files/${input.fileId}/content`, { raw: true });
    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const filename = filenameFromContentDisposition(res.headers.get("content-disposition")) ??
      input.fileId;

    const file = await ctx.file.create(bytes, { contentType, filename });
    return { file };
  },
};

export default downloadFile;
