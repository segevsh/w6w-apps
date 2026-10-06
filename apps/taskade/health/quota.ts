/**
 * Rate-limit headroom — Taskade.
 *
 * Every response carries `x-rate-limit-limit`, `x-rate-limit-remaining` and
 * `x-rate-limit-reset` (hyphenated; measured 2026-10-06 on an unauthenticated 401:
 * limit 40, reset `23.727` = seconds until the window resets). Probe: signed `GET /workspaces`,
 * the same scope-free call the Auth `test` uses. `informational`: running low in a short window
 * is context, not a verdict.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Requests remaining in the current window, read off the x-rate-limit-* headers.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/workspaces`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { state: "unknown", message: `quota probe returned HTTP ${res.status}` };
    const limit = num(res.headers.get("x-rate-limit-limit"));
    const remaining = num(res.headers.get("x-rate-limit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no x-rate-limit-* headers" };
    }
    return {
      state: headroom(remaining, limit),
      quota: [{ id: "requests", limit, remaining, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
