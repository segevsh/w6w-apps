import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient } from "../lib/client.ts";

interface Input {
  subscriptionAddOnUid: string;
  amount: number;
  usageDate?: string;
  additionalUsageData?: string;
}

/** `POST /api/v1/billing/usage` — Record a usage entry against a usage-billed subscription add-on; it is billed at the end of the month. */
const addUsage: ActionDefinition<Input> = {
  key: "add-usage",
  type: "perform",
  resource: "billing",
  title: "Add Add-on Usage",
  description:
    "Record a usage entry against a usage-billed subscription add-on; it is billed at the end of the month.",
  idempotent: false,
  params: [
    {
      key: "subscriptionAddOnUid",
      label: "Subscription add-on Uid",
      type: "string",
      hint: "The SubscriptionAddOn Uid (not the add-on definition's Uid).",
      required: true,
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      hint: "Units consumed.",
      required: true,
    },
    {
      key: "usageDate",
      label: "Usage date",
      type: "datetime",
      hint: "Defaults to now.",
    },
    {
      key: "additionalUsageData",
      label: "Additional usage data",
      type: "text",
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/billing/usage`, {
      method: "POST",
      body: {
        SubscriptionAddOn: { Uid: input.subscriptionAddOnUid },
        Amount: input.amount,
        UsageDate: input.usageDate,
        AdditionalUsageData: input.additionalUsageData,
      },
    });
  },
};

export default addUsage;
