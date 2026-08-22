import type { ActionDefinition } from "@w6w/types";
import { csv, EasyPostClient } from "../lib/client.ts";

/**
 * `POST /v2/scan_forms` — one barcode for a whole day's parcels.
 *
 * ## What this is for
 *
 * A carrier collecting fifty parcels can scan fifty labels, or scan one form.
 * The form is what turns a pile of boxes into an accepted handover: every
 * shipment on it moves to `accepted` in a single scan, which is also the moment
 * tracking starts working for the customer.
 *
 * For anyone shipping in batches this is the difference between a five-minute
 * collection and a forty-minute one, and it is entirely unglamorous — which is
 * why it tends to be missing from integrations.
 *
 * ## Every shipment must be bought, and from the same origin
 *
 * A scan form covers purchased labels leaving one address on one day. An
 * unbought shipment in the list fails the whole call, and so does a mixed
 * origin — which is the constraint that catches people running two warehouses
 * through one workflow.
 */
const action: ActionDefinition = {
  key: "scan-form-create",
  type: "perform",
  resource: "scan-form",
  title: "Create a scan form",
  description:
    "One barcode covering a batch of purchased labels, so a carrier accepts the lot in a single " +
    "scan. Every shipment must be bought and leave from the same address.",
  idempotent: false,
  params: [
    {
      key: "shipmentIds",
      label: "Shipment IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated. All must be purchased, and all must share a from address.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Scan form ID" },
    { key: "form_url", type: "string", label: "The form to print" },
    { key: "batch_id", type: "string", label: "Batch ID, when EasyPost creates one" },
    { key: "shipmentCount", type: "number", label: "Shipments covered" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ids = csv(p.shipmentIds);
    if (!ids || ids.length === 0) throw new Error("`shipmentIds` is required");

    const form = await new EasyPostClient(ctx).request<{ id?: string }>("/scan_forms", {
      method: "POST",
      wrapIn: "scan_form",
      body: { shipments: ids.map((id) => ({ id })) },
    });

    ctx.log("info", "created an EasyPost scan form", {
      scanFormId: form?.id,
      shipmentCount: ids.length,
    });
    return { ...form, shipmentCount: ids.length };
  },
};

export default action;
