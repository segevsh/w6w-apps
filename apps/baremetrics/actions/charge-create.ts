import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `POST /v1/{source_id}/charges` — Record a charge in the Baremetrics API source. */
interface Input {
  source_id: string;
  oid: string;
  amount: number;
  currency: string;
  customer_oid: string;
  created?: number;
  status?: string;
  fee?: number;
  subscription_oid?: string;
}

const chargeCreate: ActionDefinition<Input> = {
  key: "charge-create",
  type: "perform",
  resource: "charge",
  title: "Create Charge",
  description: "Record a charge in the Baremetrics API source.",
  idempotent: false,
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "oid", label: "Charge OID", type: "string", required: true },
    {
      key: "amount",
      label: "Amount (cents)",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      hint: "ISO code, e.g. usd.",
    },
    { key: "customer_oid", label: "Customer OID", type: "string", required: true },
    { key: "created", label: "Created (unix timestamp)", type: "number", hint: "Defaults to now." },
    {
      key: "status",
      label: "Status",
      type: "select",
      hint: "Vendor default is paid.",
      options: [{ value: "paid", label: "Paid" }, { value: "failed", label: "Failed" }],
    },
    {
      key: "fee",
      label: "Fee (cents)",
      type: "number",
      hint: "Vendor default 0.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "subscription_oid",
      label: "Subscription OID",
      type: "string",
      hint:
        "Only valid when Subscription Auto Charging is disabled for the account; ask Baremetrics support.",
    },
  ],
  output: [
    { key: "charge", type: "object", label: "The created charge" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request("POST", `/${encodeId(input.source_id)}/charges`, {
      body: {
        oid: input.oid,
        amount: input.amount,
        currency: input.currency,
        customer_oid: input.customer_oid,
        created: input.created,
        status: input.status,
        fee: input.fee,
        subscription_oid: input.subscription_oid,
      },
    });
  },
};

export default chargeCreate;
