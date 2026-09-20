import type { ActionDefinition, FileRef } from "@w6w/types";
import { UPLOAD_URL } from "../lib/client.ts";

interface Input {
  fileName: string;
  content: FileRef | string;
  parentId?: string;
}

const BOUNDARY = "w6wBoxUploadBoundary7f3c9a1e";

function escapeHeaderValue(value: string): string {
  return value.replace(/["\\\r\n]/g, "");
}

/**
 * Builds a multipart/form-data body as raw bytes.
 *
 * Box requires the `attributes` part to precede the `file` part — sending
 * them the other way round gets a `400 metadata_after_file_contents`. The
 * two text halves are UTF-8-encoded and the file's own bytes are spliced in
 * verbatim between them, so binary content (whatever `ctx.file.read` hands
 * back) survives the trip intact end to end — this app's `ctx.fetch` no
 * longer coerces a `Uint8Array` body to a string on its way to the network.
 */
function buildMultipart(
  attributes: Record<string, unknown>,
  fileName: string,
  fileContentType: string,
  fileBytes: Uint8Array,
): Uint8Array {
  const encoder = new TextEncoder();
  const safeName = escapeHeaderValue(fileName);
  const head = encoder.encode(
    `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="attributes"\r\n\r\n` +
      `${JSON.stringify(attributes)}\r\n` +
      `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
      `Content-Type: ${fileContentType}\r\n\r\n`,
  );
  const tail = encoder.encode(`\r\n--${BOUNDARY}--\r\n`);
  const body = new Uint8Array(head.length + fileBytes.length + tail.length);
  body.set(head, 0);
  body.set(fileBytes, head.length);
  body.set(tail, head.length + fileBytes.length);
  return body;
}

/**
 * Upload a file's bytes to Box as a new file. Uses the dedicated
 * `upload.box.com` host — every other action in this app talks to
 * `api.box.com`.
 *
 * Calls `ctx.fetch` directly (rather than `../lib/client.ts`'s `BoxClient`)
 * because the multipart body here is a `Uint8Array`, not the JSON/text shape
 * `BoxClient.request`'s `RequestOptions` carries — every other caller of
 * that helper keeps sending string/JSON bodies unchanged.
 *
 * https://developer.box.com/reference/post-files-content/
 */
const uploadFile: ActionDefinition<Input> = {
  key: "upload-file",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload a file to Box as a new file. Parent folder must exist.",
  idempotent: false,
  params: [
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
      hint: "The file to upload — a FileRef from a prior step, or its bare id.",
    },
    {
      key: "parentId",
      label: "Parent Folder ID",
      type: "string",
      default: "0",
      hint: 'Box folder ID to upload into. "0" (the default) is the root folder.',
    },
  ],

  async execute(input, ctx) {
    if (!ctx.file) {
      throw new Error(
        "upload-file requires the host to support file storage (ctx.file), " +
          "which this host does not provide.",
      );
    }
    const parentId = input.parentId ?? "0";
    const { ref, bytes } = await ctx.file.read(input.content);
    const body = buildMultipart(
      { name: input.fileName, parent: { id: parentId } },
      input.fileName,
      ref.contentType,
      bytes,
    );

    const url = `${UPLOAD_URL}/files/content`;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
      // `Uint8Array` is a valid runtime `BodyInit` (per DC-5's binary-safe
      // `ctx.fetch`); the DOM lib's `BodyInit` union in this toolchain just
      // doesn't spell that out, so the cast documents a typing gap, not a
      // runtime one.
      body: body as unknown as BodyInit,
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
      throw new Error(`Box ${res.status} ${res.statusText} for POST ${url}: ${detail}`);
    }
    return res.json();
  },
};

export default uploadFile;
