import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

const rateLimitGet: ActionDefinition<Record<string, never>> = {
  key: "rate-limit-get",
  type: "read",
  resource: "domain",
  title: "Get Rate Limit",
  description:
    "The hourly request allowance and what remains of it. Does not count against the limit.",
  params: [],

  execute(_input, ctx) {
    return new TalentLmsClient(ctx).get("ratelimit");
  },
};

export default rateLimitGet;
