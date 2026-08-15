import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam, orderIdParam, subscriptionIdParam } from "../lib/params.ts";

/** `POST /resumeSubscription` — resume a paused subscription. Idempotent, same reasoning as Pause. */
interface Input {
  orderId: string;
  subscriptionId: string;
  mode?: string;
}

const subscriptionResume: ActionDefinition<Input> = {
  key: "subscription-resume",
  type: "perform",
  resource: "subscription",
  title: "Resume Subscription",
  description: "Resume a customer's paused subscription.",
  idempotent: true,
  params: [orderIdParam, subscriptionIdParam, modeParam],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
    { key: "subscription_id", type: "string", label: "Processor subscription ID" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post("/resumeSubscription", {
      form: { order_id: input.orderId, subscription_id: input.subscriptionId },
      mode: input.mode,
    });
  },
};

export default subscriptionResume;
