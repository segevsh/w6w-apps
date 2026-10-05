import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

/**
 * `POST /workspaces/{workspaceId}/evidence-files` — pre-upload a file and get back
 * the `fileKey` that `evidence-create` references.
 *
 * The endpoint is `multipart/form-data` only. Its `base64File` field is not a bare
 * base64 string: the document's example is a **JSON string** carrying a data URL —
 * `{"base64String":"data:image/jpeg;base64,/9j/...","filename":"security-certificate.pdf"}`
 * — so that is what this action sends, as the one text part of a hand-built
 * multipart body (the sandbox has no file handle to stream).
 *
 * Accepted extensions per the document: pdf, docx, odt, doc, xlsx, ods, pptx, odp,
 * gif, jpg, jpeg, png, json, csv, md, markdown, txt, log, zip, msg, mp4.
 */
interface Input {
  workspaceId: number;
  filename: string;
  contentBase64: string;
  mimeType?: string;
}

const action: ActionDefinition<Input> = {
  key: "evidence-file-upload",
  type: "perform",
  resource: "evidence",
  title: "Upload Evidence File",
  description: "Upload a file (base64) and get a file key to attach to an evidence item.",
  idempotent: false,
  params: [
    workspaceIdParam,
    {
      key: "filename",
      label: "File name",
      type: "string",
      required: true,
      hint: "Including the extension, e.g. `soc2-report.pdf`.",
    },
    {
      key: "contentBase64",
      label: "File content (base64)",
      type: "text",
      required: true,
      hint: "Base64 of the file, or a full `data:<mime>;base64,…` URL.",
    },
    {
      key: "mimeType",
      label: "MIME type",
      type: "string",
      default: "application/octet-stream",
      hint: "Ignored when the content is already a data URL.",
    },
  ],
  output: [
    { key: "fileKey", type: "string", label: "File key (pass to Create Evidence)" },
    { key: "originalFilename", type: "string", label: "Original filename" },
    { key: "mimeType", type: "string", label: "MIME type" },
    { key: "fileSize", type: "number", label: "Size in bytes" },
  ],

  execute(input, ctx) {
    const content = input.contentBase64.trim();
    const dataUrl = content.startsWith("data:")
      ? content
      : `data:${input.mimeType || "application/octet-stream"};base64,${content}`;
    const boundary = `----w6wDrata${crypto.randomUUID().replaceAll("-", "")}`;
    const part = JSON.stringify({ base64String: dataUrl, filename: input.filename });
    const text = `--${boundary}\r\nContent-Disposition: form-data; name="base64File"\r\n\r\n` +
      `${part}\r\n--${boundary}--\r\n`;
    return new DrataClient(ctx).request(`/workspaces/${seg(input.workspaceId)}/evidence-files`, {
      method: "POST",
      rawBody: { contentType: `multipart/form-data; boundary=${boundary}`, text },
    });
  },
};

export default action;
