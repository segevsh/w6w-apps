/**
 * How much of the 24-hour sending quota is left? — `GET /v2/email/account` (GetAccount).
 *
 * The response carries `SendQuota { Max24HourSend, MaxSendRate, SentLast24Hours }` and
 * `SendingEnabled`. SES publishes NO rate-limit response headers, so this one call is the only
 * headroom signal. `Max24HourSend` of `-1` (or any non-positive value) means "no cap reported",
 * not "exhausted" — reading it the other way would flag every unlimited account as down.
 *
 * A sandbox account (`ProductionAccessEnabled: false`) has a 200/day cap, so the same arithmetic
 * is what tells a new account it is about to hit the wall. A 403 `AccessDeniedException` means
 * the key's IAM policy omits `ses:GetAccount` — that says nothing about headroom, so `unknown`.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { hostFromConnection } from "../lib/connection.ts";
import { parseError } from "../lib/api.ts";

/** Consumption at or above this fraction of the 24-hour cap is worth flagging. */
export const WARN_FRACTION = 0.9;

interface AccountBody {
  SendingEnabled?: boolean;
  EnforcementStatus?: string;
  SendQuota?: { Max24HourSend?: number; MaxSendRate?: number; SentLast24Hours?: number };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Sending quota headroom",
  description: "24-hour send quota and send rate, read from GET /v2/email/account.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const res = await ctx.fetch(`https://${host}/v2/email/account`);
    const text = await res.text();
    if (!res.ok) {
      const err = parseError(res, text);
      return {
        state: "unknown",
        message: `GetAccount returned ${res.status}${err.type ? ` ${err.type}` : ""}`,
      };
    }
    let body: AccountBody;
    try {
      body = JSON.parse(text) as AccountBody;
    } catch {
      return { state: "unknown", message: "GetAccount returned a non-JSON body" };
    }
    const q = body.SendQuota;
    if (!q || typeof q.Max24HourSend !== "number" || typeof q.SentLast24Hours !== "number") {
      return { state: "unknown", message: "GetAccount carried no SendQuota" };
    }

    const quotas: HealthQuota[] = [{
      id: "send-24h",
      limit: q.Max24HourSend,
      remaining: Math.max(0, q.Max24HourSend - q.SentLast24Hours),
      unit: "emails",
    }];
    if (typeof q.MaxSendRate === "number") {
      quotas.push({ id: "send-rate", limit: q.MaxSendRate, unit: "emails/second" });
    }

    if (body.SendingEnabled === false) {
      return {
        state: "down",
        message: `Sending is disabled for this account${
          body.EnforcementStatus ? ` (enforcement: ${body.EnforcementStatus})` : ""
        }`,
        quota: quotas,
      };
    }
    if (q.Max24HourSend <= 0) return { state: "ok", quota: quotas };

    const used = q.SentLast24Hours / q.Max24HourSend;
    if (used >= 1) {
      return {
        state: "down",
        message: `24-hour quota exhausted (${q.SentLast24Hours}/${q.Max24HourSend})`,
        quota: quotas,
      };
    }
    if (used >= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `24-hour quota at ${
          Math.round(used * 100)
        }% (${q.SentLast24Hours}/${q.Max24HourSend})`,
        quota: quotas,
      };
    }
    return { state: "ok", quota: quotas };
  },
};

export default quota;
