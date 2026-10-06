import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * List the deliveries (email, webhook, ...) configured on a document (GET /documents/{id}/deliveries).
 */
const documentDeliveryList: ActionDefinition<Input> = {
  key: "document-delivery-list",
  type: "read",
  resource: "delivery",
  title: "List Document Deliveries",
  description:
    "List the deliveries (email, webhook, ...) configured on a document (GET /documents/{id}/deliveries).",
  params: [
    {
      key: "id",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "The numeric document ID from Get a List of Documents.",
    },
  ],
  output: [
    { key: "deliveries", type: "array", label: "Array of { id, type, settings }" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/documents/${encodeURIComponent(input.id)}/deliveries`);
  },
};

export default documentDeliveryList;
