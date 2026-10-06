/**
 * How much of the plan's sending allowance is left?
 *
 * `GET /v1/account` (Account API key, scope `account.read`) returns a `usage` array of exactly
 * three entries — Hourly Outbound, Monthly Outbound, Monthly Inbound — each
 * `{ name, quantity, used, available }`, where `quantity: -1` means unlimited. The check reports
 * the two outbound entries. `degraded` at 90% used, `down` when a limit is exhausted (sends then
 * fail), `ok` otherwise. Needs the Account API key; a connection holding only a Sending Key
 * (or a key without `account.read`) reports `unknown`, not a failure.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { ACCOUNT_BASE } from "../lib/client.ts";

export const ACCOUNT_URL = `${ACCOUNT_BASE}/account`;

interface Usage {
  name?: string;
  quantity?: number;
  used?: number;
  available?: number;
}

const OUTBOUND: Record<string, string> = {
  "Hourly Outbound Usage": "outbound-hourly",
  "Monthly Outbound Usage": "outbound-monthly",
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Sending headroom",
  description: "Hourly and monthly outbound usage vs the plan, from GET /v1/account. Needs the " +
    "Account API key with account.read.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(ACCOUNT_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `quota read failed: ${(err as Error).message}` };
    }
    if (!res.ok) {
      return {
        state: "unknown",
        message: res.status === 403
          ? "the Account API key lacks the account.read scope"
          : `GET /v1/account answered HTTP ${res.status}`,
      };
    }
    const body = await res.json().catch(() => null) as { data?: { usage?: Usage[] } } | null;
    const entries = (body?.data?.usage ?? []).filter((u) => u.name && OUTBOUND[u.name]);
    if (!entries.length) return { state: "unknown", message: "GET /v1/account carried no usage" };

    let state: HealthState = "ok";
    const notes: string[] = [];
    const quota = [];
    for (const u of entries) {
      const unlimited = u.quantity === -1;
      const limit = Number(u.quantity ?? 0);
      const used = Number(u.used ?? 0);
      const remaining = unlimited ? undefined : Number(u.available ?? limit - used);
      if (!unlimited && limit > 0) {
        if (remaining! <= 0) {
          state = "down";
          notes.push(`${u.name} exhausted (${used}/${limit})`);
        } else if (used / limit >= 0.9 && state !== "down") {
          state = "degraded";
          notes.push(`${u.name} at ${Math.round((used / limit) * 100)}% (${used}/${limit})`);
        }
      }
      if (remaining !== undefined) {
        quota.push({ id: OUTBOUND[u.name!], remaining, limit, unit: "emails" });
      }
    }
    return {
      state,
      message: notes.length ? notes.join("; ") : undefined,
      quota,
      ttlSeconds: 300,
    };
  },
};

export default quota;
