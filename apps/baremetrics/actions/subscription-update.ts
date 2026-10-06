import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId, jsonValue } from "../lib/client.ts";

/** `PUT /v1/{source_id}/subscriptions/{oid}` — Change a subscription's plan, quantity, discount or add-ons. */
interface Input {
  source_id: string;
  oid: string;
  plan_oid: string;
  occurred_at?: number;
  quantity?: number;
  discount?: number;
  addons?: unknown;
}

const subscriptionUpdate: ActionDefinition<Input> = {
  key: "subscription-update",
  type: "perform",
  resource: "subscription",
  title: "Update Subscription",
  description: "Change a subscription's plan, quantity, discount or add-ons.",
  idempotent: true,
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
    {
      key: "occurred_at",
      label: "Occurred at (unix timestamp)",
      type: "number",
      hint: "Defaults to now.",
    },
    { key: "quantity", label: "Quantity", type: "number", validation: { integer: true, min: 1 } },
    { key: "discount", label: "Discount", type: "number" },
    {
      key: "addons",
      label: "Add-ons",
      type: "json",
      hint: "Array of {oid, amount (cents), quantity}.",
    },
  ],
  output: [
    { key: "subscription", type: "object", label: "The updated subscription" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "PUT",
      `/${encodeId(input.source_id)}/subscriptions/${encodeId(input.oid)}`,
      {
        body: {
          plan_oid: input.plan_oid,
          occurred_at: input.occurred_at,
          quantity: input.quantity,
          discount: input.discount,
          addons: jsonValue(input.addons),
        },
      },
    );
  },
};

export default subscriptionUpdate;
