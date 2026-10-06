import type { ActionDefinition } from "@w6w/types";
import { compact, PaystackClient, required } from "../lib/client.ts";

/** `POST /subscription` — the customer needs a saved authorization from a past payment. */
interface Input {
  customer: string;
  plan: string;
  authorization?: string;
  startDate?: string;
}

const subscriptionCreate: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description:
    "Subscribe an existing customer to a plan. The customer must already have a reusable card " +
    "authorization from a successful payment.",
  idempotent: false,
  params: [
    {
      key: "customer",
      label: "Customer",
      type: "string",
      required: true,
      hint: "Customer code or email.",
    },
    { key: "plan", label: "Plan code", type: "string", required: true },
    {
      key: "authorization",
      label: "Authorization code",
      type: "string",
      hint: "AUTH_… Defaults to the customer's most recent authorization.",
    },
    { key: "startDate", label: "Start date", type: "string", hint: "ISO 8601; first charge date." },
  ],
  output: [
    { key: "subscription_code", type: "string", label: "Subscription code" },
    { key: "email_token", type: "string", label: "Email token (needed to disable)" },
    { key: "status", type: "string", label: "Status" },
  ],
  async execute(input, ctx) {
    return await new PaystackClient(ctx).data("/subscription", {
      method: "POST",
      body: compact({
        customer: required(input.customer, "Customer"),
        plan: required(input.plan, "Plan code"),
        authorization: input.authorization, // request-body field, not a header
        start_date: input.startDate,
      }),
    });
  },
};

export default subscriptionCreate;
