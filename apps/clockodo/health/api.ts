/**
 * Is `my.clockodo.com/api` answering? An UNSIGNED `GET /v4/users/me`.
 *
 * Measured 2026-10-06: with no credential, and with a fake one, the API answers
 * `401 application/json` with exactly
 * `{"errors":[{"type":"General","message":"Authentication failed","details":null,"path":null}]}`.
 * That schema-correct refusal proves the API is serving, so it is a PASS: an unsigned probe is
 * judged on reachability, never on credential validity — `auth:api-key` does that.
 *
 * Clockodo publishes no status page (no `status.clockodo.*` host answers; the Statuspage.io
 * subdomain `clockodo` redirects to Atlassian's marketing page), so there is no `service`
 * check — this is the only reachability signal.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, type ClockodoBody } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Clockodo API reachability",
  description:
    "An unauthenticated GET /v4/users/me. The documented `Authentication failed` error envelope proves the Clockodo API is serving; it says nothing about any credential.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/v4/users/me`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach my.clockodo.com: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: ClockodoBody | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: handled below */ }

    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    const first = Array.isArray(body?.errors) ? body.errors[0] : undefined;
    if (res.status === 401 && first?.type === "General" && typeof first.message === "string") {
      return {
        state: "ok",
        message: "API answered with the documented authentication error",
        ttlSeconds: 60,
      };
    }
    if (res.status === 429) return { state: "degraded", message: "API is rate limiting" };
    return {
      state: "degraded",
      message: `unexpected ${res.status} from an unsigned GET /v4/users/me: ${raw.slice(0, 120)}`,
    };
  },
};

export default api;
