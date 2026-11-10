import type { ActionDefinition } from "@w6w/types";
import routeDeliveryMethodList from "../actions/route-delivery-method-list.ts";
import { dataItems, idOrContent, snapshotTrigger } from "../lib/triggers.ts";

/** `GET /api/routes/delivery-methods/{routeId}` — the delivery methods of one route the user
 * picks; the OpenAPI lists no paging, so one response is the whole bounded collection.
 * https://app.documerge.ai/api-docs/openapi.yaml */
export default snapshotTrigger({
  key: "new-route-delivery-method",
  title: "New Route Delivery Method",
  description: "The run gets each delivery method newly added to the chosen route.",
  action: routeDeliveryMethodList as unknown as ActionDefinition,
  params: routeDeliveryMethodList.params,
  input: (params) => ({ routeId: params.routeId }),
  items: dataItems,
  keyOf: idOrContent,
  output: [{ key: "id", type: "number", label: "Delivery method ID" }],
  sample: { id: 5 },
});
