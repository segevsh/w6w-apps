import type { ActionDefinition } from "@w6w/types";
import { MillionVerifierClient } from "../lib/client.ts";

/** `GET /api/v3/credits` — free; the body is counters, never the key. */
const getCredits: ActionDefinition = {
  key: "get-credits",
  type: "read",
  resource: "account",
  title: "Get Credits",
  description: "Read the account's remaining credits, renewing credits and plan. Free.",
  params: [],
  output: [
    { key: "credits", type: "number", label: "Remaining credits" },
    { key: "bulkCredits", type: "number", label: "Remaining credits (same as credits)" },
    { key: "renewingCredits", type: "number", label: "Renewing credits" },
    { key: "plan", type: "number", label: "Plan number" },
  ],

  async execute(_input, ctx) {
    const { body } = await new MillionVerifierClient(ctx).request("/api/v3/credits", {
      api: "single",
    });
    const b = (body ?? {}) as Record<string, unknown>;
    return {
      credits: b.credits,
      bulkCredits: b.bulk_credits,
      renewingCredits: b.renewing_credits,
      plan: b.plan,
    };
  },
};

export default getCredits;
