import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";
interface Input {
  fileUploadId: string;
  fileBase64: string;
  filename: string;
  contentType?: string;
  partNumber?: number;
}
const action: ActionDefinition<Input> = {
  key: "send-file-upload",
  type: "perform",
  resource: "file-upload",
  title: "Send File Upload",
  description:
    "Send binary contents to an upload created with Create File Upload. Supports individual multipart upload parts.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "in_trash", "type": "boolean", "label": "In trash" },
    { "key": "expiry_time", "type": "object", "label": "Expiry time" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "filename", "type": "object", "label": "Filename" },
    { "key": "content_type", "type": "object", "label": "Content type" },
    { "key": "content_length", "type": "object", "label": "Content length" },
    { "key": "upload_url", "type": "string", "label": "Upload url" },
    { "key": "complete_url", "type": "string", "label": "Complete url" },
    { "key": "file_import_result", "type": "object", "label": "File import result" },
    { "key": "number_of_parts", "type": "object", "label": "Number of parts" },
  ],
  idempotent: false,
  params: [
    { key: "fileUploadId", label: "File Upload ID", type: "string", required: true },
    {
      key: "fileBase64",
      label: "File contents (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded file bytes, or a base64 data URL.",
    },
    { key: "filename", label: "Filename", type: "string", required: true },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      hint: "MIME type, for example application/pdf.",
    },
    {
      key: "partNumber",
      label: "Part number",
      type: "number",
      validation: { integer: true, min: 1, max: 1000 },
      hint:
        "For multipart uploads only, starting at 1. Complete the upload after sending all parts.",
    },
  ],
  execute(input, ctx) {
    const data = input.fileBase64.match(/^data:([^;]+);base64,(.*)$/s);
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      bytes = Uint8Array.from(atob(data?.[2] ?? input.fileBase64), (c) => c.charCodeAt(0));
    } catch {
      throw new Error("File contents must be valid base64.");
    }
    if (
      input.partNumber !== undefined &&
      (!Number.isInteger(input.partNumber) || input.partNumber < 1 || input.partNumber > 1000)
    ) {
      throw new Error("Part number must be an integer from 1 to 1000.");
    }
    const form = new FormData();
    form.set(
      "file",
      new Blob([bytes], { type: input.contentType ?? data?.[1] ?? "application/octet-stream" }),
      input.filename,
    );
    if (input.partNumber !== undefined) form.set("part_number", String(input.partNumber));
    return new NotionClient(ctx).request(`/file_uploads/${pathId(input.fileUploadId)}/send`, {
      method: "POST",
      form,
    });
  },
};
export default action;
