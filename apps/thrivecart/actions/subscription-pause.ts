import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam, orderIdParam, subscriptionIdParam } from "../lib/params.ts";

/**
 * `POST /pauseSubscription` — pause billing, optionally until an auto-resume
 * timestamp. Idempotent for the same reason as Cancel Subscription: it sets
 * one target to a target state rather than creating a new resource.
 */
interface Input {
  orderId: string;
  subscriptionId: string;
  autoResume?: number;
  mode?: string;
}

const subscriptionPause: ActionDefinition<Input> = {
  key: "subscription-pause",
  type: "perform",
  resource: "subscription",
  title: "Pause Subscription",
  description: "Pause a customer's recurring subscription, indefinitely or until a given date.",
  idempotent: true,
  params: [
    orderIdParam,
    subscriptionIdParam,
    {
      key: "autoResume",
      label: "Auto-resume at (Unix timestamp)",
      type: "number",
      hint: "Optional. Must be at least 24 hours in the future. Leave empty to pause indefinitely.",
    },
    modeParam,
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
    { key: "customer_id", type: "string", label: "Processor customer ID" },
    { key: "frequency", type: "string", label: "Billing frequency" },
    { key: "plan_id", type: "string", label: "Processor plan ID" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post("/pauseSubscription", {
      form: {
        order_id: input.orderId,
        subscription_id: input.subscriptionId,
        auto_resume: input.autoResume,
      },
      mode: input.mode,
    });
  },
};

export default subscriptionPause;
