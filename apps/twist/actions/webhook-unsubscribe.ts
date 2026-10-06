import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/hooks/unsubscribe`
 *
 * Stop Twist calling a registered URL.
 */
interface Input {
  targetUrl: string;
}

const webhookUnsubscribe: ActionDefinition<Input> = {
  key: "webhook-unsubscribe",
  type: "perform",
  resource: "webhook",
  title: "Unsubscribe from Event",
  description: "Stop Twist calling a registered URL.",
  idempotent: true,
  params: [
    { key: "targetUrl", label: "Target URL", type: "string", required: true },
  ],
  output: [
    {
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/hooks/unsubscribe",
      params: { "target_url": input.targetUrl },
    });
  },
};

export default webhookUnsubscribe;
