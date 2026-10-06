/**
 * Monthly call-credit headroom, from `GET /key`.
 *
 * `/key` returns plan, rate limit and credit usage only — it does not echo the key.
 * It is a paid-plan endpoint (documented "Basic and above"; a Demo key is refused), so
 * every non-200 is reported `unknown`, and the check is `informational`: a Demo
 * connection must not be marked broken for lacking a quota endpoint.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { BASE_URL, errorDetail } from "../lib/client.ts";

export const WARN_FRACTION = 0.9;

interface UsageBody {
  plan?: string;
  rate_limit_request_per_minute?: number;
  monthly_call_credit?: number;
  current_total_monthly_calls?: number;
  current_remaining_monthly_calls?: number;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Monthly call credits",
  description: "Remaining monthly call credits for the connected key, read from GET /key.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${BASE_URL}/key`, { headers: { accept: "application/json" } });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const { code, message } = errorDetail(text);
      return {
        state: "unknown",
        message: `/key unavailable${
          code ? ` (${code})` : ""
        }: ${message} — Demo keys have no usage endpoint`,
      };
    }
    let body: UsageBody | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      // handled below
    }
    const limit = body?.monthly_call_credit;
    const remaining = body?.current_remaining_monthly_calls;
    if (typeof limit !== "number" || typeof remaining !== "number") {
      return { state: "unknown", message: "/key carried no monthly credit figures" };
    }
    let state: HealthState = "ok";
    let message: string | undefined;
    if (limit > 0 && remaining <= 0) {
      state = "down";
      message = `monthly credits exhausted (0/${limit})`;
    } else if (limit > 0 && (limit - remaining) / limit >= WARN_FRACTION) {
      state = "degraded";
      message = `${remaining}/${limit} monthly credits left`;
    }
    return {
      state,
      message,
      quota: [{ id: "monthly-call-credits", limit, remaining, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
