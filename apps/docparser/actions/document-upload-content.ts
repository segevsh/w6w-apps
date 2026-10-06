import type { ActionDefinition } from "@w6w/types";
import { DocparserClient, encodeId } from "../lib/client.ts";

interface Input {
  parserId: string;
  fileContent: string;
  fileName?: string;
  remoteId?: string;
}

const documentUploadContent: ActionDefinition<Input> = {
  key: "document-upload-content",
  type: "perform",
  resource: "document",
  title: "Upload Document by Content",
  description:
    "Upload a document as base64 content. Returns the new document ID and the account's " +
    "remaining quota. Asynchronous: poll Get Document Status, then fetch the results.",
  idempotent: false,
  params: [
    { key: "parserId", label: "Parser ID", type: "string", required: true },
    {
      key: "fileContent",
      label: "File content (base64)",
      type: "text",
      required: true,
      hint: "The file bytes, base64 encoded.",
    },
    {
      key: "fileName",
      label: "File name",
      type: "string",
      hint: "Optional; Docparser names the file from the upload time when empty.",
    },
    { key: "remoteId", label: "Remote ID", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "file_size", type: "number", label: "File size (bytes)" },
    { key: "quota_used", type: "number", label: "Quota used" },
    { key: "quota_left", type: "number", label: "Quota left" },
    { key: "quota_refill", type: "string", label: "Quota refill time" },
  ],

  execute(input, ctx) {
    const parserId = encodeId(input.parserId, "parserId");
    const content = input.fileContent?.trim();
    if (!content) throw new Error("fileContent is required");
    return new DocparserClient(ctx).json(`/v1/document/upload/${parserId}`, {
      method: "POST",
      form: { file_content: content, file_name: input.fileName, remote_id: input.remoteId },
    });
  },
};

export default documentUploadContent;
