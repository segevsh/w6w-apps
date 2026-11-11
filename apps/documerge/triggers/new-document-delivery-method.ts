import type { ActionDefinition } from "@w6w/types";
import documentDeliveryMethodList from "../actions/document-delivery-method-list.ts";
import { dataItems, idOrContent, snapshotTrigger } from "../lib/triggers.ts";

/** `GET /api/documents/delivery-methods/{documentId}` — the delivery methods of one document the
 * user picks; the OpenAPI lists no paging, so one response is the whole bounded collection.
 * https://app.documerge.ai/api-docs/openapi.yaml */
export default snapshotTrigger({
  key: "new-document-delivery-method",
  title: "New Document Delivery Method",
  description: "The run gets each delivery method newly added to the chosen document.",
  action: documentDeliveryMethodList as unknown as ActionDefinition,
  params: documentDeliveryMethodList.params,
  input: (params) => ({ documentId: params.documentId }),
  items: dataItems,
  keyOf: idOrContent,
  output: [{ key: "id", type: "number", label: "Delivery method ID" }],
  sample: { id: 5 },
});
