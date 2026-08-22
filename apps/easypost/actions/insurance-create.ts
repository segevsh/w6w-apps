import type { ActionDefinition } from "@w6w/types";
import { compact, EasyPostClient } from "../lib/client.ts";

/**
 * `POST /v2/insurances` — insure a parcel EasyPost did not ship.
 *
 * For a shipment bought here, insurance belongs in `shipment-buy` — it is
 * cheaper as part of the purchase and it is one object rather than two. This
 * covers the other case: a label bought elsewhere, or a parcel already in
 * transit that somebody has realised is worth more than they thought.
 *
 * ## There is a window, and it closes
 *
 * EasyPost will not insure a parcel that has already been delivered, and
 * carriers impose their own limits on how late a policy can be taken out.
 * "Insure it after it goes missing" is not a workflow — by then the tracker
 * says so and the answer is no.
 *
 * The declared value is what a claim pays out against, so under-declaring to
 * save on the premium is a decision that only shows up when something is lost.
 */
const action: ActionDefinition = {
  key: "insurance-create",
  type: "perform",
  resource: "insurance",
  title: "Insure a parcel",
  description:
    "Insure a parcel shipped elsewhere. For labels bought here, insure at purchase instead — " +
    "and note the window closes: a delivered or missing parcel cannot be insured retroactively.",
  idempotent: false,
  params: [
    {
      key: "trackingCode",
      label: "Tracking Number",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "carrier",
      label: "Carrier",
      type: "string",
      default: "",
      hint: "Inferred from the tracking number when omitted.",
    },
    {
      key: "amount",
      label: "Declared Value",
      type: "number",
      required: true,
      default: 0,
      hint: "What a claim pays out against. Under-declaring to save on the premium only shows up " +
        "when something is lost.",
    },
    {
      key: "toAddress",
      label: "To Address",
      type: "json",
      required: true,
      default: "",
      hint: "Inline or by id.",
    },
    {
      key: "fromAddress",
      label: "From Address",
      type: "json",
      required: true,
      default: "",
    },
    { key: "reference", label: "Reference", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Insurance ID" },
    { key: "status", type: "string", label: "Policy status" },
    { key: "fee", type: "object", label: "What the premium cost" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const trackingCode = String(p.trackingCode ?? "").trim();
    if (!trackingCode) throw new Error("`trackingCode` is required");
    const amount = Number(p.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("`amount` is required — it is the value a claim pays out against");
    }
    const toAddress = p.toAddress;
    const fromAddress = p.fromAddress;
    if (!toAddress) throw new Error("`toAddress` is required");
    if (!fromAddress) throw new Error("`fromAddress` is required");

    const parse = (
      v: unknown,
    ) => (typeof v === "string" && v.trim().startsWith("{")
      ? JSON.parse(v)
      : typeof v === "string"
      ? { id: v.trim() }
      : v);

    const insurance = await new EasyPostClient(ctx).request<{ id?: string; status?: string }>(
      "/insurances",
      {
        method: "POST",
        wrapIn: "insurance",
        body: compact({
          tracking_code: trackingCode,
          carrier: p.carrier,
          amount: String(amount),
          to_address: parse(toAddress),
          from_address: parse(fromAddress),
          reference: p.reference,
        }),
      },
    );

    ctx.log("info", "insured a parcel with EasyPost", {
      insuranceId: insurance?.id,
      status: insurance?.status,
    });
    return insurance;
  },
};

export default action;
