import type { ActionDefinition } from "@w6w/types";
import { DocparserClient, encodeId, toList } from "../lib/client.ts";

interface Input {
  parserId: string;
  documentIds: string[] | string;
}

const documentReintegrate: ActionDefinition<Input> = {
  key: "document-reintegrate",
  type: "perform",
  resource: "document",
  title: "Re-Integrate Documents",
  description:
    "Schedule documents for the integration queue again, so the parser's configured integrations and webhooks fire for them.",
  idempotent: true,
  params: [
    { key: "parserId", label: "Parser ID", type: "string", required: true },
    {
      key: "documentIds",
      label: "Document IDs",
      type: "string",
      required: true,
      hint: "Comma- or newline-separated. IDs come from the document_id field of parsed results.",
    },
  ],
  output: [
    { key: "total_reintegrate", type: "number", label: "Documents scheduled" },
    { key: "msg", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    const parserId = encodeId(input.parserId, "parserId");
    const ids = toList(input.documentIds);
    if (ids.length === 0) throw new Error("documentIds must list at least one document ID");
    return new DocparserClient(ctx).json(`/v1/document/reintegrate/${parserId}`, {
      method: "POST",
      form: { document_ids: ids },
    });
  },
};

export default documentReintegrate;
