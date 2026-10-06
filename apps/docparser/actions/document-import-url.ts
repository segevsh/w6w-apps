import type { ActionDefinition } from "@w6w/types";
import { DocparserClient, encodeId } from "../lib/client.ts";

interface Input {
  parserId: string;
  url: string;
  remoteId?: string;
}

const documentImportUrl: ActionDefinition<Input> = {
  key: "document-import-url",
  type: "perform",
  resource: "document",
  title: "Import Document from URL",
  description: "Have Docparser fetch a publicly accessible document and queue it for parsing. " +
    "Asynchronous: poll Get Document Status, then fetch the results.",
  idempotent: false,
  params: [
    { key: "parserId", label: "Parser ID", type: "string", required: true },
    { key: "url", label: "Document URL", type: "string", required: true },
    {
      key: "remoteId",
      label: "Remote ID",
      type: "string",
      hint: "Your own ID, stored with the document and returned in its results.",
    },
  ],
  output: [
    { key: "document_id", type: "string", label: "Document ID" },
    { key: "parser_id", type: "string", label: "Parser ID" },
    { key: "remote_id", type: "string", label: "Remote ID" },
    { key: "message", type: "string", label: "Message (includes the status URL)" },
  ],

  execute(input, ctx) {
    const parserId = encodeId(input.parserId, "parserId");
    if (!input.url?.trim()) throw new Error("url is required");
    return new DocparserClient(ctx).json(`/v2/document/fetch/${parserId}`, {
      method: "POST",
      form: { url: input.url.trim(), remote_id: input.remoteId },
    });
  },
};

export default documentImportUrl;
