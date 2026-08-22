/**
 * Can **this connection** actually reach its tenant, and does its token still
 * carry the scopes it needs?
 *
 * The counterpart to the incident feed. That feed reports what Auth0 has
 * *announced*; this reports what this connection can *do* — and the two fail
 * independently:
 *
 *   - a tenant that was renamed or deleted answers `404` from a hostname that
 *     still resolves;
 *   - a machine-to-machine application whose Management API grant was revoked
 *     answers `403` while every credential remains valid;
 *   - the token expires roughly daily, so a `401` here usually means the
 *     refresh did not run rather than that anything is wrong with Auth0.
 *
 * It reads `GET /api/v2/users?per_page=1&include_totals=true`, which is the
 * cheapest authenticated call that also returns something useful: the tenant's
 * total user count, reported as a quota-shaped figure so a host can see it move.
 *
 * `403` is deliberately **`degraded`, not `down`**: a missing `read:users`
 * grant breaks the user actions and leaves roles, organizations and logs
 * working. Reporting the whole app as down would be wrong.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, displayOf } from "../lib/client.ts";

const tenant: HealthCheckDefinition = {
  key: "tenant",
  title: "Tenant reachability",
  description:
    "Reads one user from this connection's own tenant — catching a renamed tenant, a revoked " +
    "Management API grant, and a token that was never refreshed.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const domain = String(displayOf(ctx.connection).domain ?? "");
    if (!domain) return { state: "down", message: "this connection records no Auth0 domain" };

    let res: Response;
    try {
      res = await ctx.fetch(
        `https://${domain}${API_PATH}/users?per_page=1&include_totals=true`,
        { headers: { accept: "application/json" } },
      );
    } catch (err) {
      return { state: "down", message: `could not reach ${domain}: ${String(err)}` };
    }

    if (res.status === 401) {
      await res.body?.cancel();
      // The derived auth check owns credential failures; this one names the
      // likely cause and gets out of the way.
      return {
        state: "unknown",
        message: "the Management API token was rejected — it is short-lived, so this is usually " +
          "a refresh that did not run",
      };
    }
    if (res.status === 403) {
      await res.body?.cancel();
      return {
        state: "degraded",
        message: "this application is not granted `read:users` on the Management API — the user " +
          "actions will fail, the rest will not",
      };
    }
    if (res.status === 404) {
      await res.body?.cancel();
      return { state: "down", message: `no tenant answering at ${domain}` };
    }
    if (res.status === 429) {
      await res.body?.cancel();
      return {
        state: "degraded",
        message: "rate limited — Auth0 meters the Management API per tenant",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `${domain} answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as { total?: number } | null;
    const total = typeof body?.total === "number" ? body.total : undefined;
    return {
      state: "ok",
      message: total === undefined ? `${domain} reachable` : `${domain} — ${total} users`,
      quota: total === undefined ? undefined : [{ id: "users", remaining: total, unit: "users" }],
      ttlSeconds: 300,
    };
  },
};

export default tenant;
