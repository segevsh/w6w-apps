import type { ActionDefinition } from "@w6w/types";
import { ProspeoClient } from "../lib/client.ts";

const getAccountInformation: ActionDefinition<Record<string, never>> = {
  key: "get-account-information",
  type: "read",
  resource: "account",
  title: "Get Account Information",
  description:
    "Read the current plan, team size, remaining and used credits and next quota renewal (GET /account-information). Free.",
  params: [],
  output: [
    { key: "current_plan", type: "string", label: "Plan name, e.g. STARTER" },
    { key: "current_team_members", type: "number", label: "Team size" },
    { key: "remaining_credits", type: "number", label: "Credits left" },
    { key: "used_credits", type: "number", label: "Credits used" },
    { key: "next_quota_renewal_days", type: "number", label: "Days until renewal" },
    { key: "next_quota_renewal_date", type: "string", label: "Renewal date-time (UTC)" },
  ],

  async execute(_input, ctx) {
    const body = await new ProspeoClient(ctx).call<{ response?: Record<string, unknown> }>(
      "/account-information",
      { method: "GET" },
    );
    return body.response ?? {};
  },
};

export default getAccountInformation;
