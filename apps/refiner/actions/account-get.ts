import type { ActionDefinition } from "@w6w/types";
import { RefinerClient } from "../lib/client.ts";

const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "Fetch the subscription plan, monthly usage (tracked users, events, page views, survey " +
    "responses) against plan limits, and the account's environments.",
  params: [],
  output: [
    { key: "subscription", type: "object", label: "Plan and monthly usage counters" },
    { key: "environments", type: "object", label: "Environments with their usage" },
  ],

  async execute(_input, ctx) {
    return await new RefinerClient(ctx).json("/account");
  },
};

export default accountGet;
