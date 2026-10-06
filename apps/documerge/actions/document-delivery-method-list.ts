import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  documentId: number;
}

const documentDeliveryMethodList: ActionDefinition<Input> = {
  key: "document-delivery-method-list",
  type: "search",
  resource: "delivery-method",
  title: "List Document Delivery Methods",
  description: "List where a document's merge results are delivered.",
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "number",
      required: true,
      hint: "From List Documents.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Delivery methods" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/documents/delivery-methods/${encodeURIComponent(String(input.documentId))}`,
      { method: "GET" },
    );
  },
};

export default documentDeliveryMethodList;
