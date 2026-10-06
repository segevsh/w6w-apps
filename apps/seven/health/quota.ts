import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { PROBE_URL } from "./api.ts";

/**
 * Prepaid balance left on THIS account. seven publishes no rate-limit header or usage-limit
 * endpoint (none documented, none seen on live responses), so request-rate headroom is not
 * declared. What does gate sending is credit: an SMS with too little credit is refused with
 * code 500. `GET /balance` (the same call the credential test uses) answers
 * `{"amount": 12.35, "currency": "EUR"}` — no key material — so it is read signed.
 *
 * Informational: a low balance is worth showing and never worth failing a verdict over, and the
 * vendor states no threshold, so only an empty balance is flagged (`down`, as the next send
 * would be refused). An auth refusal (bare `900`) is `unknown`, the credential check owns that.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Account balance",
  description: "Remaining prepaid balance from GET /balance.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `seven returned ${res.status}` };
    const body = await res.json().catch(() => null) as
      | { amount?: unknown; currency?: unknown }
      | null;
    if (!body || typeof body !== "object" || typeof body.amount !== "number") {
      return { state: "unknown", message: "balance probe did not return an amount" };
    }
    const unit = typeof body.currency === "string" ? body.currency : "credit";
    const entry: HealthQuota = { id: "balance", remaining: body.amount, unit };
    if (body.amount <= 0) {
      return {
        state: "down",
        message: `balance is ${body.amount} ${unit}; sending will be refused (code 500)`,
        quota: [entry],
      };
    }
    return { state: "ok", message: `${body.amount} ${unit}`, quota: [entry], ttlSeconds: 300 };
  },
};

export default quota;
