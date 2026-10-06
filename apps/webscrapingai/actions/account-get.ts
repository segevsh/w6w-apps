import type { ActionDefinition } from "@w6w/types";
import { WsaiClient } from "../lib/client.ts";

const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Read the account email, remaining credits, concurrency and the next reset time.",
  params: [],
  output: [
    { key: "email", type: "string", label: "Account email" },
    { key: "remaining_monthly_credits", type: "number", label: "Monthly credits left" },
    { key: "remaining_payg_credits", type: "number", label: "Pay-as-you-go credits left" },
    { key: "remaining_total_credits", type: "number", label: "Total credits left" },
    { key: "resets_at", type: "number", label: "Next billing cycle start (UNIX seconds)" },
    { key: "remaining_concurrency", type: "number", label: "Concurrent requests still allowed" },
  ],

  async execute(_input, ctx) {
    return await new WsaiClient(ctx).json("/account");
  },
};

export default accountGet;
