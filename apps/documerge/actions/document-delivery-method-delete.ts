import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  documentId: number;
  deliveryMethodId: number;
}

const documentDeliveryMethodDelete: ActionDefinition<Input> = {
  key: "document-delivery-method-delete",
  type: "perform",
  resource: "delivery-method",
  title: "Delete Document Delivery Method",
  description: "Remove a delivery method from a document.",
  idempotent: true,
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "number",
      required: true,
      hint: "From List Documents.",
    },
    {
      key: "deliveryMethodId",
      label: "Delivery method ID",
      type: "number",
      required: true,
      hint: "From List Delivery Methods.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when removed" },
  ],

  async execute(input, ctx) {
    return (await new DocuMergeClient(ctx).json(
      `/api/documents/delivery-methods/${encodeURIComponent(String(input.documentId))}/${
        encodeURIComponent(String(input.deliveryMethodId))
      }`,
      { method: "DELETE" },
    )) ?? { deleted: true };
  },
};

export default documentDeliveryMethodDelete;
