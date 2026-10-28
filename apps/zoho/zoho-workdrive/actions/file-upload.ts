import type { ActionDefinition, FileRef } from "@w6w/types";
import { API_PREFIX, apiHostFromConnection, formatWorkDriveError, JSONAPI } from "../lib/client.ts";

interface Input {
  parentId: string;
  fileName: string;
  content: FileRef | string;
  overrideExisting?: boolean;
}

const BOUNDARY = "w6wWorkDriveUploadBoundary5b2e8d41";

function esc(value: string): string {
  return value.replace(/["\\\r\n]/g, "");
}

/** Build a multipart/form-data body as raw bytes, splicing the file's bytes in verbatim. */
function buildMultipart(
  fields: Record<string, string>,
  fileName: string,
  contentType: string,
  bytes: Uint8Array,
): Uint8Array {
  const enc = new TextEncoder();
  let head = "";
  for (const [k, v] of Object.entries(fields)) {
    head += `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${esc(k)}"\r\n\r\n${v}\r\n`;
  }
  head += `--${BOUNDARY}\r\nContent-Disposition: form-data; name="content"; ` +
    `filename="${esc(fileName)}"\r\nContent-Type: ${esc(contentType)}\r\n\r\n`;
  const h = enc.encode(head);
  const t = enc.encode(`\r\n--${BOUNDARY}--\r\n`);
  const out = new Uint8Array(h.length + bytes.length + t.length);
  out.set(h, 0);
  out.set(bytes, h.length);
  out.set(t, h.length + bytes.length);
  return out;
}

/**
 * `POST /upload` — multipart/form-data with `parent_id`, `content` (the file, max 250 MB),
 * optional `filename` and `override-name-exist`. Larger files need the chunked "large file
 * upload" session API, which this app does not implement.
 */
const fileUpload: ActionDefinition<Input> = {
  key: "file-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload a file (up to 250 MB) into a WorkDrive folder.",
  idempotent: false,
  params: [
    { key: "parentId", label: "Destination Folder ID", type: "string", required: true },
    {
      key: "fileName",
      label: "File Name",
      type: "string",
      required: true,
      hint: "e.g. invoice.pdf",
    },
    {
      key: "content",
      label: "File",
      type: "file",
      required: true,
      hint: "A FileRef from a prior step, or its bare id.",
    },
    {
      key: "overrideExisting",
      label: "Replace same-named file",
      type: "boolean",
      default: false,
      hint:
        "true uploads over a same-named file as a new top version; false adds a timestamp to the new name.",
    },
  ],
  output: [{ key: "item", type: "object", label: "Upload response (JSON:API `data`)" }],

  async execute(input, ctx) {
    if (!ctx.file) {
      throw new Error("file-upload requires host file storage (ctx.file), which this host lacks.");
    }
    const { ref, bytes } = await ctx.file.read(input.content);
    const body = buildMultipart(
      {
        parent_id: input.parentId,
        filename: input.fileName,
        "override-name-exist": input.overrideExisting === true ? "true" : "false",
      },
      input.fileName,
      ref.contentType,
      bytes,
    );
    const host = apiHostFromConnection(ctx.connection);
    const path = "/upload";
    const res = await ctx.fetch(`https://${host}${API_PREFIX}${path}`, {
      method: "POST",
      headers: { accept: JSONAPI, "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
      body: body as unknown as BodyInit,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(formatWorkDriveError(res.status, "POST", path, text));
    const parsed = text ? JSON.parse(text) as { data?: unknown } : {};
    return { item: parsed.data ?? parsed };
  },
};

export default fileUpload;
