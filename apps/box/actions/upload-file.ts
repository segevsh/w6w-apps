import type { ActionDefinition } from "@w6w/types";
import { BoxClient, UPLOAD_URL } from "../lib/client.ts";

interface Input {
  fileName: string;
  content: string;
  parentId?: string;
}

const BOUNDARY = "w6wBoxUploadBoundary7f3c9a1e";

function escapeHeaderValue(value: string): string {
  return value.replace(/["\\\r\n]/g, "");
}

/**
 * Hand-builds a multipart/form-data body as plain text.
 *
 * Box requires the `attributes` part to precede the `file` part — sending
 * them the other way round gets a `400 metadata_after_file_contents`. Every
 * `ctx.fetch` body in this sandbox is coerced to a string on its way to the
 * network (see `../lib/client.ts`), so a `FormData` or binary body would not
 * survive the trip intact. Building the payload as UTF-8 text up front —
 * content restricted to text, exactly like this pack's Dropbox app — keeps
 * the body a string end to end and the part ordering exactly what we wrote.
 */
function buildMultipart(
  attributes: Record<string, unknown>,
  fileName: string,
  content: string,
): string {
  const safeName = escapeHeaderValue(fileName);
  return (
    `--${BOUNDARY}\r\n` +
    `Content-Disposition: form-data; name="attributes"\r\n\r\n` +
    `${JSON.stringify(attributes)}\r\n` +
    `--${BOUNDARY}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n` +
    `${content}\r\n` +
    `--${BOUNDARY}--\r\n`
  );
}

/**
 * Upload text content as a new file. Uses the dedicated `upload.box.com`
 * host — every other action in this app talks to `api.box.com`.
 *
 * https://developer.box.com/reference/post-files-content/
 */
const uploadFile: ActionDefinition<Input> = {
  key: "upload-file",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload text content to Box as a new file. Parent folder must exist.",
  idempotent: false,
  params: [
    {
      key: "fileName",
      label: "File Name",
      type: "string",
      required: true,
      hint: "e.g. invoice.txt",
    },
    {
      key: "content",
      label: "File Content",
      type: "text",
      required: true,
      hint: "UTF-8 text to write. Binary uploads are not supported by this action.",
    },
    {
      key: "parentId",
      label: "Parent Folder ID",
      type: "string",
      default: "0",
      hint: 'Box folder ID to upload into. "0" (the default) is the root folder.',
    },
  ],

  execute(input, ctx) {
    const client = new BoxClient(ctx);
    const parentId = input.parentId ?? "0";
    const body = buildMultipart(
      { name: input.fileName, parent: { id: parentId } },
      input.fileName,
      input.content,
    );
    return client.request(`${UPLOAD_URL}/files/content`, {
      method: "POST",
      rawBody: body,
      headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
    });
  },
};

export default uploadFile;
