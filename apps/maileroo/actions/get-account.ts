import type { ActionDefinition } from "@w6w/types";
import { MailerooClient } from "../lib/client.ts";

/** `GET /v1/account` (scope `account.read`). `usage` is always the three documented entries. */
const getAccount: ActionDefinition = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Read the account overview: identity, plan, hourly/monthly outbound and inbound " +
    "usage, subscription and billing details. Needs the Account API Key (account.read).",
  params: [],
  output: [
    { key: "userId", type: "number", label: "Account ID" },
    { key: "name", type: "string", label: "Account name" },
    { key: "email", type: "string", label: "Account email" },
    { key: "currentPlan", type: "object", label: "Plan (id, name, quantity)" },
    {
      key: "usage",
      type: "array",
      label: "Hourly Outbound, Monthly Outbound, Monthly Inbound (-1 = unlimited)",
    },
    { key: "subscription", type: "object", label: "Subscription summary" },
    { key: "billingInformation", type: "object", label: "Billing details on file" },
  ],

  async execute(_input, ctx) {
    const { data } = await new MailerooClient(ctx).account("/account");
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      userId: d.user_id,
      name: d.name,
      email: d.email,
      currentPlan: d.current_plan,
      usage: d.usage ?? [],
      subscription: d.subscription,
      billingInformation: d.billing_information,
    };
  },
};

export default getAccount;
