/**
 * Is this connection's Egnyte domain reachable?
 *
 *   - `kind: "dependency"`, `scope: "connection"` — every Connection points at a
 *     different `<domain>.egnyte.com`.
 *   - `credential: "context"` — needs the Connection to know WHICH host to call,
 *     needs no credential to interpret the answer. `sign` must not run.
 *   - `*.egnyte.com` is already on the app's allowlist.
 *
 * The probe is unauthenticated `GET /pubapi/v1/userinfo`. Measured 2026-10-06:
 * an existing domain answers **401** with a JSON `{"fault": ...}` body (Apigee's
 * invalid-token fault); a domain that does not exist does not resolve at all, so
 * the fetch throws. A 401 is therefore a PASS — it proves the account is
 * serving; whether the token is any good is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const domain: HealthCheckDefinition = {
  key: "domain",
  title: "Account domain reachable",
  description:
    "Unauthenticated request to this connection's Egnyte domain. A 401 passes — it proves the account is serving; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { domain?: string };
    if (!display.domain) {
      return { state: "unknown", message: "connection records no domain" };
    }
    let status: number;
    try {
      const res = await ctx.fetch(`${baseUrl(display.domain)}/v1/userinfo`, {
        headers: { accept: "application/json" },
      });
      status = res.status;
    } catch {
      return { state: "down", message: "domain did not answer — it may not exist or be renamed" };
    }
    if (status === 404) {
      return { state: "down", message: "domain not found — the account may have been renamed" };
    }
    if (status >= 500) return { state: "down", message: `domain returned ${status}` };
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default domain;
