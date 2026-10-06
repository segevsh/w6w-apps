import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";

/**
 * `GET /account/` — the connected user, credit usage and rate limits. The
 * body carries the owner's name and email and, per the published schema, no API key (the Universal
 * account endpoint does, which is why it is never used as a probe).
 */
const getAccount: ActionDefinition = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Read the connected RocketReach account: owner, credit usage per credit type " +
    "(allocated, used, remaining) and the current rate-limit windows. " +
    "On a Universal Credits account use Get Universal Account.",
  params: [],
  output: [
    { key: "id", type: "number", label: "RocketReach user ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Account email" },
    { key: "state", type: "string", label: "anonymous, test_user or registered" },
    { key: "creditUsage", type: "array", label: "Per credit type: allocated, used, remaining" },
    { key: "rateLimits", type: "array", label: "Per action and window: limit, used, remaining" },
  ],

  async execute(_input, ctx) {
    const { body } = await new RocketReachClient(ctx).request("/account/");
    const a = (body ?? {}) as Record<string, unknown>;
    return {
      id: a.id,
      firstName: a.first_name ?? null,
      lastName: a.last_name ?? null,
      email: a.email ?? null,
      state: a.state ?? null,
      creditUsage: Array.isArray(a.credit_usage) ? a.credit_usage : [],
      rateLimits: Array.isArray(a.rate_limits) ? a.rate_limits : [],
    };
  },
};

export default getAccount;
