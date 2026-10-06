import type { ActionDefinition } from "@w6w/types";
import { asObject, DocuMergeClient } from "../lib/client.ts";

interface Input {
  key: string;
  data?: unknown;
}

const documentMerge: ActionDefinition<Input> = {
  key: "document-merge",
  type: "perform",
  resource: "document",
  title: "Merge Document",
  description:
    "Queue a merge of a document by its merge key. The merge runs asynchronously; results go to the document's delivery methods.",
  idempotent: false,
  params: [
    {
      key: "key",
      label: "Document key",
      type: "string",
      required: true,
      hint: "The `key` of the document (from Get Document), not its numeric id.",
    },
    {
      key: "data",
      label: "Merge data",
      type: "json",
      hint:
        "JSON object of field values to merge, keyed by field name. Sent verbatim as the request body.",
    },
  ],
  output: [
    { key: "message", type: "string", label: 'Vendor confirmation, e.g. "Document merge queued!"' },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/documents/merge/${encodeURIComponent(String(input.key))}`,
      { method: "POST", body: asObject(input.data, "Merge data") },
    );
  },
};

export default documentMerge;
