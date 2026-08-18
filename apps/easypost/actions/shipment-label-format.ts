import type { ActionDefinition } from "@w6w/types";
import { EasyPostClient, query } from "../lib/client.ts";

/**
 * `GET /v2/shipments/{id}/label` — get the label in another format.
 *
 * A bought shipment comes with a PNG. A warehouse does not want a PNG: a
 * thermal printer wants **ZPL** (or EPL2), and a paper process wants **PDF**.
 * Converting after the fact is what this endpoint is for, and the converted
 * URL is stored on the shipment afterwards rather than being generated afresh
 * each time.
 *
 * It only works on a **purchased** shipment — there is no label before that —
 * and asking for a format the carrier does not support returns an error rather
 * than a fallback.
 */
const action: ActionDefinition = {
  key: "shipment-label-format",
  type: "read",
  resource: "shipment",
  title: "Convert a label's format",
  description:
    "Re-render a purchased label as ZPL, EPL2 or PDF — a thermal printer will not take the PNG " +
    "a purchase returns.",
  params: [
    { key: "shipmentId", label: "Shipment ID", type: "string", required: true, default: "" },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "PDF",
      options: [
        { value: "PDF", label: "PDF — for paper" },
        { value: "ZPL", label: "ZPL — for a Zebra thermal printer" },
        { value: "EPL2", label: "EPL2 — for an older thermal printer" },
        { value: "PNG", label: "PNG — the default a purchase returns" },
      ],
    },
  ],
  output: [
    { key: "labelUrl", type: "string", label: "The label in the requested format" },
    { key: "postage_label", type: "object", label: "Every format now available" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipmentId = String(p.shipmentId ?? "").trim();
    if (!shipmentId) throw new Error("`shipmentId` is required");
    const format = String(p.format ?? "PDF").toUpperCase();

    const shipment = await new EasyPostClient(ctx).request<{
      postage_label?: Record<string, string>;
    }>(`/shipments/${encodeURIComponent(shipmentId)}/label`, {
      query: query({ file_format: format }),
    });

    const label = shipment?.postage_label ?? {};
    const key = format === "PNG" ? "label_url" : `label_${format.toLowerCase()}_url`;
    return { ...shipment, labelUrl: label[key] ?? label["label_url"] };
  },
};

export default action;
