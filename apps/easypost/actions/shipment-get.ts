import type { ActionDefinition } from "@w6w/types";
import { EasyPostClient, sortRates } from "../lib/client.ts";
import type { Rate } from "../lib/client.ts";

/**
 * `GET /v2/shipments/{id}` — one shipment, before or after purchase.
 *
 * The same object means two different things depending on when you ask.
 * **Before buying** it is a quote: `rates` is populated, `selected_rate`,
 * `postage_label` and `tracking_code` are all null. **After buying** those
 * three are filled in and `rates` is history.
 *
 * `bought` is returned as an explicit boolean for that reason — branching on
 * whether `postage_label` happens to be null is the same check written less
 * clearly.
 */
const action: ActionDefinition = {
  key: "shipment-get",
  type: "read",
  resource: "shipment",
  title: "Get a shipment",
  description:
    "One shipment. Before purchase it is a quote with rates; after purchase it carries the " +
    "label and tracking code and the rates are history.",
  params: [
    { key: "shipmentId", label: "Shipment ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Shipment ID" },
    { key: "bought", type: "boolean", label: "Whether postage has been purchased" },
    { key: "rates", type: "array", label: "Rates, cheapest first — before purchase" },
    { key: "tracking_code", type: "string", label: "Tracking number — after purchase" },
    { key: "labelUrl", type: "string", label: "The label — after purchase" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipmentId = String(p.shipmentId ?? "").trim();
    if (!shipmentId) throw new Error("`shipmentId` is required");

    const shipment = await new EasyPostClient(ctx).request<{
      rates?: Rate[];
      postage_label?: { label_url?: string };
      tracking_code?: string | null;
    }>(`/shipments/${encodeURIComponent(shipmentId)}`);

    return {
      ...shipment,
      rates: sortRates(shipment?.rates ?? []),
      bought: Boolean(shipment?.postage_label?.label_url),
      labelUrl: shipment?.postage_label?.label_url,
    };
  },
};

export default action;
