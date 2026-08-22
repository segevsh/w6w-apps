import type { ActionDefinition } from "@w6w/types";
import { compact, EasyPostClient, sortRates } from "../lib/client.ts";
import type { Rate } from "../lib/client.ts";

/**
 * `POST /v2/shipments/{id}/buy` — **purchase postage**.
 *
 * This is the action that spends money. It takes a rate from
 * `shipment-create`, buys it, and returns a label and a tracking code. There is
 * no undo: `shipment-refund` asks the carrier for the money back and the answer
 * is not guaranteed.
 *
 * ## Buying the cheapest is a choice, and it is offered explicitly
 *
 * Most workflows want the lowest price, and hand-picking a rate id from an
 * array is awkward in a graph. So this accepts either a specific `rateId` or
 * **Cheapest**, which re-reads the shipment's rates and picks the lowest
 * numerically — comparing them as strings would put `"9.99"` above `"10.05"`.
 *
 * Cheapest is not always right: the cheapest rate may be a five-day service on
 * a next-day order. `maxPrice` is the guard for a workflow that buys
 * automatically — a rate above it is refused rather than purchased, which is
 * the difference between a bad day and a bad week.
 *
 * ## Insurance is bought here or not at all
 *
 * Passing an amount insures the parcel as part of the purchase. Doing it
 * afterwards is a separate object and a separate charge, and after the parcel
 * has moved it is too late.
 *
 * ## What comes back
 *
 * `postage_label.label_url` is a PNG, with `label_pdf_url` and `label_zpl_url`
 * beside it — ZPL being what a thermal label printer wants. `tracking_code` is
 * the carrier's number, and `tracker.public_url` is the page a customer can be
 * sent to.
 */
const action: ActionDefinition = {
  key: "shipment-buy",
  type: "perform",
  resource: "shipment",
  title: "Buy postage for a shipment",
  description:
    "PURCHASES the label. Money moves, a tracking code is issued, and a refund is a request to " +
    "the carrier rather than an undo.",
  idempotent: false,
  params: [
    { key: "shipmentId", label: "Shipment ID", type: "string", required: true, default: "" },
    {
      key: "rateId",
      label: "Rate ID",
      type: "string",
      default: "",
      hint: "From `shipment-create`. Leave blank to buy the cheapest — see below.",
    },
    {
      key: "buyCheapest",
      label: "Buy the Cheapest Rate",
      type: "boolean",
      default: false,
      hint: "Re-reads the shipment and picks the lowest price numerically. Convenient, and not " +
        "always right — the cheapest rate may be a five-day service on a next-day order.",
    },
    {
      key: "maxPrice",
      label: "Maximum Price",
      type: "number",
      default: 0,
      hint: "Refuse to buy above this. The guard worth setting on anything that buys " +
        "automatically; 0 means no limit.",
    },
    {
      key: "insuranceAmount",
      label: "Insure For",
      type: "number",
      default: 0,
      hint: "Declared value, insured as part of the purchase. Insuring afterwards is a separate " +
        "object and a separate charge, and once the parcel has moved it is too late.",
    },
    {
      key: "endShipperId",
      label: "End Shipper ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "For platforms buying on behalf of a merchant.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Shipment ID" },
    { key: "tracking_code", type: "string", label: "The carrier's tracking number" },
    { key: "labelUrl", type: "string", label: "The label — a PNG" },
    { key: "labelPdfUrl", type: "string", label: "The same label as a PDF" },
    { key: "labelZplUrl", type: "string", label: "ZPL, for a thermal label printer" },
    { key: "selected_rate", type: "object", label: "What was actually bought" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipmentId = String(p.shipmentId ?? "").trim();
    if (!shipmentId) throw new Error("`shipmentId` is required");

    const client = new EasyPostClient(ctx);
    let rateId = String(p.rateId ?? "").trim();
    const maxPrice = Number(p.maxPrice ?? 0);

    // Resolve the rate first when buying by price, so the ceiling can be
    // enforced before any money moves.
    if (!rateId || p.buyCheapest === true || maxPrice > 0) {
      const shipment = await client.request<{ rates?: Rate[] }>(
        `/shipments/${encodeURIComponent(shipmentId)}`,
      );
      const rates = sortRates(shipment?.rates ?? []);
      if (rates.length === 0) throw new Error("this shipment has no rates to buy");

      const chosen = rateId ? rates.find((r) => r.id === rateId) : rates[0];
      if (!chosen) {
        throw new Error(`rate ${rateId} is not on this shipment — re-rate it and choose again`);
      }
      const price = Number(chosen.rate ?? Infinity);
      if (maxPrice > 0 && price > maxPrice) {
        throw new Error(
          `refusing to buy: the ${chosen.carrier} ${chosen.service} rate is ${chosen.rate} ` +
            `${chosen.currency ?? ""}, above the ${maxPrice} ceiling`,
        );
      }
      rateId = String(chosen.id ?? "");
    }

    const insurance = Number(p.insuranceAmount ?? 0);
    // Logged before the purchase: if the request dies mid-flight, this line is
    // the only record that money may have moved.
    ctx.log("info", "buying EasyPost postage", { shipmentId, rateId });

    const bought = await client.request<{
      tracking_code?: string;
      postage_label?: { label_url?: string; label_pdf_url?: string; label_zpl_url?: string };
      selected_rate?: Rate;
    }>(`/shipments/${encodeURIComponent(shipmentId)}/buy`, {
      method: "POST",
      body: compact({
        rate: { id: rateId },
        insurance: insurance > 0 ? String(insurance) : undefined,
        end_shipper_id: p.endShipperId,
      }),
    });

    ctx.log("info", "bought EasyPost postage", {
      shipmentId,
      carrier: bought?.selected_rate?.carrier,
      price: bought?.selected_rate?.rate,
    });
    return {
      ...bought,
      labelUrl: bought?.postage_label?.label_url,
      labelPdfUrl: bought?.postage_label?.label_pdf_url,
      labelZplUrl: bought?.postage_label?.label_zpl_url,
    };
  },
};

export default action;
