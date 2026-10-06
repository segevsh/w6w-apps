import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, PrintfulClient, typeList } from "../lib/client.ts";

interface Input {
  url: string;
  types: unknown;
  params?: unknown;
}

/** `POST /webhooks` — Enable the store's webhook URL and event types. */
const webhookSet: ActionDefinition<Input> = {
  key: "webhook-set",
  type: "perform",
  resource: "webhook",
  title: "Set Webhook",
  description:
    "Enable the store's webhook URL and event types. Only one URL is active per store: this replaces any existing configuration.",
  idempotent: true,
  params: [
    {
      key: "url",
      label: "Webhook URL",
      type: "string",
      required: true,
      hint: "HTTPS endpoint that receives the events.",
    },
    {
      key: "types",
      label: "Event types",
      type: "json",
      required: true,
      hint:
        "Array (or comma-separated text) of: package_shipped, package_returned, order_created, order_updated, order_failed, order_canceled, product_synced, product_updated, product_deleted, stock_updated, order_put_hold, order_put_hold_approval, order_remove_hold, order_refunded.",
    },
    {
      key: "params",
      label: "Event parameters",
      type: "json",
      hint: 'Only for `stock_updated`: {"stock_updated":{"product_ids":[5,12]}}.',
    },
  ],
  output: [
    { key: "url", type: "string", label: "Webhook URL" },
    { key: "types", type: "array", label: "Enabled event types" },
    { key: "params", type: "object", label: "Event parameters" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "POST",
      "/webhooks",
      {
        body: compact({
          url: input.url,
          types: typeList(input.types),
          params: jsonValue(input.params),
        }),
      },
    );
    return result ?? {};
  },
};

export default webhookSet;
