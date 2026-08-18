import type { ActionDefinition } from "@w6w/types";
import { addressRef, compact, csv, EasyPostClient, json, sortRates } from "../lib/client.ts";
import type { Rate } from "../lib/client.ts";

/**
 * `POST /v2/shipments` — describe a parcel and find out what it costs to send.
 *
 * ## This buys nothing
 *
 * Creating a shipment is a **quote**. EasyPost takes the two addresses and the
 * parcel, asks every carrier account you have, and answers with a `rates` array
 * — carrier, service, price, delivery estimate. No label exists, no tracking
 * code has been issued, and nothing is owed. `shipment-buy` is the step that
 * spends money, and it is deliberately a separate action.
 *
 * ## `service` is not offered here, on purpose
 *
 * EasyPost supports a "one-call buy": include a `service` and carrier accounts
 * in the *creation* request and it purchases immediately. That is convenient
 * for a human and a trap in a workflow, because a step named "create shipment"
 * would silently charge money. This action does not accept it — quoting and
 * buying stay two steps.
 *
 * ## Rates come back unordered, and `rate` is a string
 *
 * Sorting them as strings puts `"9.99"` above `"10.05"`. This action returns
 * them sorted numerically and surfaces `cheapestRate` separately, because
 * picking the cheapest is what most workflows do next and doing it by hand is
 * where that bug lives.
 *
 * ## Addresses may be inline or by id
 *
 * A warehouse that ships all day should create its origin address once and pass
 * the id: one fewer object per shipment, and it is the address EasyPost has
 * already verified.
 */
const action: ActionDefinition = {
  key: "shipment-create",
  type: "perform",
  resource: "shipment",
  title: "Create a shipment and get rates",
  description:
    "Describe a parcel and get every carrier's price for it. This BUYS NOTHING — no label, no " +
    "tracking code, nothing owed. `shipment-buy` is the step that spends money.",
  idempotent: false,
  params: [
    {
      key: "toAddress",
      label: "To Address",
      type: "json",
      required: true,
      default: "",
      hint: 'Inline — {"name":"…","street1":"…","city":"…","state":"…","zip":"…","country":"US"} ' +
        "— or an existing address id as a plain string.",
    },
    {
      key: "fromAddress",
      label: "From Address",
      type: "json",
      required: true,
      default: "",
      hint: "Inline or by id. A warehouse shipping all day should create this once and pass the " +
        "id.",
    },
    {
      key: "parcel",
      label: "Parcel",
      type: "json",
      required: true,
      default: "",
      hint: 'Weight in OUNCES and dimensions in INCHES: {"length":10,"width":8,"height":4,' +
        '"weight":16}. A parcel id also works.',
    },
    {
      key: "customsInfo",
      label: "Customs Info",
      type: "json",
      default: "",
      hint: "Required for anything crossing a border. Without it an international shipment rates " +
        "and then fails at purchase.",
    },
    {
      key: "reference",
      label: "Reference",
      type: "string",
      default: "",
      hint: "Your own identifier — an order number. It comes back on the shipment and on " +
        "webhooks, and is the only thing tying a label to whatever caused it.",
    },
    {
      key: "carrierAccounts",
      label: "Carrier Accounts",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated ids to rate against. Blank uses all of them; EasyPost considers at " +
        "most 60 and silently ignores the rest.",
    },
    {
      key: "options",
      label: "Options",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Carrier options, e.g. {"delivery_confirmation":"SIGNATURE"}.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Shipment ID — pass it to `shipment-buy`" },
    { key: "rates", type: "array", label: "Every carrier's price, cheapest first" },
    { key: "cheapestRate", type: "object", label: "The lowest-priced rate, compared numerically" },
    { key: "rateCount", type: "number", label: "How many carriers quoted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const toAddress = addressRef(p.toAddress, "toAddress");
    const fromAddress = addressRef(p.fromAddress, "fromAddress");
    const parcel = addressRef(p.parcel, "parcel");
    if (!toAddress) throw new Error("`toAddress` is required");
    if (!fromAddress) throw new Error("`fromAddress` is required");
    if (!parcel) throw new Error("`parcel` is required");

    const shipment = await new EasyPostClient(ctx).request<{ id?: string; rates?: Rate[] }>(
      "/shipments",
      {
        method: "POST",
        wrapIn: "shipment",
        body: compact({
          to_address: toAddress,
          from_address: fromAddress,
          parcel,
          customs_info: json(p.customsInfo, "customsInfo"),
          reference: p.reference,
          carrier_accounts: csv(p.carrierAccounts)?.map((id) => ({ id })),
          options: json(p.options, "options"),
        }),
      },
    );

    const rates = sortRates(shipment?.rates ?? []);
    if (rates.length === 0) {
      // Rating silently returning nothing is a real outcome — no carrier
      // account can serve the route — and it is better said than discovered.
      ctx.log("warn", "EasyPost returned no rates for this shipment", { shipmentId: shipment?.id });
    }

    ctx.log("info", "created an EasyPost shipment", {
      shipmentId: shipment?.id,
      rateCount: rates.length,
    });
    return { ...shipment, rates, cheapestRate: rates[0], rateCount: rates.length };
  },
};

export default action;
