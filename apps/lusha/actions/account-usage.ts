import type { ActionDefinition } from "@w6w/types";
import { LushaClient } from "../lib/client.ts";

type Input = Record<string, never>;

const action: ActionDefinition<Input> = {
  key: "account-usage",
  type: "read",
  resource: "account",
  title: "Get Account Usage",
  description:
    "Credits (total, used, remaining), daily/hourly/per-minute rate-limit windows, plan, and the credit price of each action. Limited to 5 requests per minute.",
  params: [],
  output: [
    { key: "credits", type: "object", label: "total, used, remaining" },
    { key: "rateLimits", type: "object", label: "daily, hourly and minute windows" },
    { key: "plan", type: "object", label: "category, renewalType, startDate, endDate" },
    { key: "pricing", type: "object", label: "Credit cost per action type" },
  ],

  execute(_input, ctx) {
    return new LushaClient(ctx).request("GET", `/v3/account/usage`, {});
  },
};

export default action;
