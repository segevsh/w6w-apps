import type { ActionDefinition } from "@w6w/types";
import { EasyPostClient } from "../lib/client.ts";

/**
 * `POST /v2/shipments/{id}/refund` — ask for the postage back.
 *
 * ## This is a request, not a reversal
 *
 * The distinction matters because "refund" sounds final and is not. EasyPost
 * asks the carrier, the carrier decides, and the answer arrives asynchronously:
 * the shipment's `refund_status` moves through `submitted` to `refunded` or
 * `rejected`, and can take days. A carrier will reject a refund for a label
 * that was scanned — reasonably, since it was used.
 *
 * So a workflow that refunds and immediately treats the money as recovered is
 * wrong. This returns `refund_status` and a `pending` boolean rather than
 * implying success, and `shipment-get` is where the outcome eventually shows
 * up.
 *
 * The right time to call it is as soon as an order is cancelled, before the
 * parcel is handed over — after that the answer is usually no.
 */
const action: ActionDefinition = {
  key: "shipment-refund",
  type: "perform",
  resource: "shipment",
  title: "Refund a shipment",
  description:
    "Ask the carrier to refund the postage. It is a REQUEST — the carrier decides, over days, " +
    "and rejects labels that were scanned. Not an undo.",
  idempotent: true,
  params: [
    { key: "shipmentId", label: "Shipment ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Shipment ID" },
    { key: "refund_status", type: "string", label: "submitted, refunded or rejected" },
    { key: "pending", type: "boolean", label: "True while the carrier has not decided" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipmentId = String(p.shipmentId ?? "").trim();
    if (!shipmentId) throw new Error("`shipmentId` is required");

    const shipment = await new EasyPostClient(ctx).request<{ refund_status?: string }>(
      `/shipments/${encodeURIComponent(shipmentId)}/refund`,
      { method: "POST" },
    );
    const status = shipment?.refund_status;
    ctx.log("info", "requested an EasyPost postage refund", { shipmentId, refundStatus: status });

    return {
      ...shipment,
      // Anything other than a decided outcome means the carrier is still thinking.
      pending: status !== "refunded" && status !== "rejected",
    };
  },
};

export default action;
