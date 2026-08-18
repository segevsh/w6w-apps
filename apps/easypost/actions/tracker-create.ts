import type { ActionDefinition } from "@w6w/types";
import { compact, EasyPostClient } from "../lib/client.ts";

/**
 * `POST /v2/trackers` — follow a parcel EasyPost did not ship.
 *
 * A shipment bought here tracks itself: buying returns a `tracker` and EasyPost
 * pushes updates as webhooks. This is for the other case — a tracking number
 * from somewhere else. A supplier's dispatch note, a returns label the customer
 * bought, a marketplace order fulfilled elsewhere.
 *
 * That is the useful half for most businesses, because inbound parcels and
 * customer returns are exactly the ones nobody has visibility of.
 *
 * ## The carrier is optional and worth giving
 *
 * EasyPost will infer it from the number's format, which usually works and
 * occasionally does not — several carriers use overlapping formats. Naming the
 * carrier removes the ambiguity.
 *
 * ## Creating a tracker starts a subscription
 *
 * From here EasyPost polls the carrier and emits a `tracker.updated` webhook on
 * every change. A workflow that creates a tracker per parcel and then also
 * polls `tracker-get` on a schedule is doing the work twice and paying for the
 * privilege.
 */
const action: ActionDefinition = {
  key: "tracker-create",
  type: "perform",
  resource: "tracker",
  title: "Track a parcel",
  description:
    "Follow a tracking number EasyPost did not issue — a supplier's dispatch, a customer's " +
    "return. Creating one subscribes to updates, so polling as well is doing the work twice.",
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
      placeholder: "UPS",
      hint: "EasyPost infers this from the number's format, which usually works — several " +
        "carriers use overlapping formats, so naming it removes the ambiguity.",
    },
    {
      key: "amount",
      label: "Declared Value",
      type: "number",
      default: 0,
      advanced: true,
      hint: "For insurance claims on a parcel bought elsewhere.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Tracker ID" },
    { key: "status", type: "string", label: "Where the parcel is now" },
    { key: "public_url", type: "string", label: "A page a customer can be sent to" },
    { key: "est_delivery_date", type: "string", label: "The carrier's estimate" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const trackingCode = String(p.trackingCode ?? "").trim();
    if (!trackingCode) throw new Error("`trackingCode` is required");
    const amount = Number(p.amount ?? 0);

    const tracker = await new EasyPostClient(ctx).request<{ id?: string; status?: string }>(
      "/trackers",
      {
        method: "POST",
        wrapIn: "tracker",
        body: compact({
          tracking_code: trackingCode,
          carrier: p.carrier,
          amount: amount > 0 ? String(amount) : undefined,
        }),
      },
    );

    ctx.log("info", "created an EasyPost tracker", {
      trackerId: tracker?.id,
      status: tracker?.status,
    });
    return tracker;
  },
};

export default action;
