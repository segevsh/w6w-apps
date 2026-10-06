import type { ActionDefinition } from "@w6w/types";
import { call, pick, requireStr } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const webhookUnsubscribe: ActionDefinition<Input> = {
  key: "webhook-unsubscribe",
  type: "perform",
  resource: "webhook",
  title: "Unsubscribe Webhook",
  description: "Cancel a webhook subscription by its ID or reference name.",
  idempotent: true,
  params: [
    str("event", "Event", { required: true }),
    str("uniqueid", "Subscription ID"),
    str("client_reference", "Reference name", { hint: "Use instead of the ID." }),
  ],
  output: [
    { key: "unsubscribed", type: "boolean", label: "Cancelled" },
  ],

  async execute(input, ctx) {
    if (!String(input.uniqueid ?? "").trim() && !String(input.client_reference ?? "").trim()) {
      throw new Error("uniqueid or client_reference is required");
    }
    await call(ctx, "POST", "/v1/webhooks/unsubscribe", {
      body: {
        event: requireStr("event", input.event),
        ...pick(input, ["uniqueid", "client_reference"]),
      },
    });
    return { unsubscribed: true };
  },
};

export default webhookUnsubscribe;
