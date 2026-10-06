import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId, jsonValue } from "../lib/client.ts";

/** `POST /v1/{source_id}/subscriptions` — Create a subscription in the Baremetrics API source. */
interface Input {
  source_id: string;
  oid: string;
  plan_oid: string;
  customer_oid: string;
  started_at: number;
  canceled_at?: number;
  quantity?: number;
  discount?: number;
  addons?: unknown;
}

const subscriptionCreate: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description: "Create a subscription in the Baremetrics API source.",
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
    { key: "oid", label: "Subscription OID", type: "string", required: true },
    { key: "plan_oid", label: "Plan OID", type: "string", required: true },
    { key: "customer_oid", label: "Customer OID", type: "string", required: true },
    { key: "started_at", label: "Started at (unix timestamp)", type: "number", required: true },
    {
      key: "canceled_at",
      label: "Canceled at (unix timestamp)",
      type: "number",
      hint: "Cannot be changed later; set only when certain.",
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      hint: "Vendor default 1.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "discount",
      label: "Discount",
      type: "number",
      hint: "Integer in the plan's currency units.",
    },
    {
      key: "addons",
      label: "Add-ons",
      type: "json",
      hint: "Array of {oid, amount (cents), quantity}.",
    },
  ],
  output: [
    { key: "subscription", type: "object", label: "The created subscription" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "POST",
      `/${encodeId(input.source_id)}/subscriptions`,
      {
        body: {
          oid: input.oid,
          plan_oid: input.plan_oid,
          customer_oid: input.customer_oid,
          started_at: input.started_at,
          canceled_at: input.canceled_at,
          quantity: input.quantity,
          discount: input.discount,
          addons: jsonValue(input.addons),
        },
      },
    );
  },
};

export default subscriptionCreate;
