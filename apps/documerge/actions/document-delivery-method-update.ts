import type { ActionDefinition } from "@w6w/types";
import { asObject, compact, DocuMergeClient } from "../lib/client.ts";

interface Input {
  documentId: number;
  deliveryMethodId: number;
  type: string;
  settings: unknown;
}

const documentDeliveryMethodUpdate: ActionDefinition<Input> = {
  key: "document-delivery-method-update",
  type: "perform",
  resource: "delivery-method",
  title: "Update Document Delivery Method",
  description: "Change a document delivery method's type or settings.",
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
    {
      key: "type",
      label: "Delivery type",
      type: "string",
      required: true,
      hint: "Delivery method type, e.g. webhook, email, dropbox.",
    },
    {
      key: "settings",
      label: "Settings",
      type: "json",
      required: true,
      hint:
        "JSON object of settings for that delivery type; see the shape returned by List Delivery Methods.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The vendor's `data` envelope" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/documents/delivery-methods/${encodeURIComponent(String(input.documentId))}/${
        encodeURIComponent(String(input.deliveryMethodId))
      }`,
      {
        method: "PUT",
        body: compact({ type: input.type, settings: asObject(input.settings, "Settings") }),
      },
    );
  },
};

export default documentDeliveryMethodUpdate;
