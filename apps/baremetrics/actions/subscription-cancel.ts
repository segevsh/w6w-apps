import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `PUT /v1/{source_id}/subscriptions/{oid}/cancel` — Cancel a subscription at a given time. */
interface Input {
  source_id: string;
  oid: string;
  canceled_at: number;
}

const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description: "Cancel a subscription at a given time.",
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
    {
      key: "canceled_at",
      label: "Canceled at (unix timestamp)",
      type: "number",
      required: true,
      hint: "When the subscription was, or will be, canceled.",
    },
  ],
  output: [
    { key: "subscription", type: "object", label: "The canceled subscription" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "PUT",
      `/${encodeId(input.source_id)}/subscriptions/${encodeId(input.oid)}/cancel`,
      {
        body: { canceled_at: input.canceled_at },
      },
    );
  },
};

export default subscriptionCancel;
