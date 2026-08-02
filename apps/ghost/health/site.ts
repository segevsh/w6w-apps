/**
 * Is THIS connection's Ghost site reachable, and is its Admin API alive?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. Ghost(Pro) has a vendor platform,
 *     but a self-hosted install does not: for that install, the site IS the
 *     dependency, and its availability is a property of the tenant's own
 *     infrastructure, not Ghost's.
 *   - `scope: "connection"` — every Connection points at a different site, so
 *     there is no shareable app-wide answer.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer: `GET /site/` is deliberately the
 *     one Admin API route Ghost itself does not require a JWT for. `sign`
 *     must not run.
 *   - No `network.allow` is declared: the site is already reachable under the
 *     app's own `["*"]` allowlist, and a `context` check is unsigned
 *     regardless.
 *   - `severity` defaults to `degraded` for this kind. The derived
 *     `auth:admin-api-key` check already covers the case where the key pair
 *     itself stops working, so this one stays advisory — it is what tells
 *     the two failures apart.
 *
 * `GET /site/` returns basic public site metadata (title, description,
 * version) with no authentication. A DNS failure or a site that's down
 * entirely fails the request outright; a reachable-but-misconfigured Admin
 * API (wrong path, reverse proxy stripping `/ghost`) surfaces as a non-2xx or
 * non-JSON response — either way, a different failure from a bad key pair,
 * which is what `auth:admin-api-key` reports.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Site reachable",
  description: "Unauthenticated `GET /ghost/api/admin/site/` against this connection's site — " +
    "proves the host resolves AND that the Admin API is enabled.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { siteUrl?: string };
    const siteUrl = display.siteUrl?.replace(/\/+$/, "");
    if (!siteUrl) return { state: "unknown", message: "connection records no site URL" };

    const res = await ctx.fetch(`${siteUrl}/ghost/api/admin/site/`, {
      headers: { accept: "application/json" },
    });
    if (res.status === 404) {
      return {
        state: "down",
        message: "Admin API not found at /ghost/api/admin/site/ (wrong URL, or a proxy is " +
          "stripping the path)",
      };
    }
    if (res.status >= 500) {
      return { state: "down", message: `site returned ${res.status}` };
    }
    if (!res.ok) {
      return { state: "degraded", message: `site returned ${res.status}`, ttlSeconds: 120 };
    }
    let body: { site?: unknown };
    try {
      body = await res.json();
    } catch {
      return { state: "degraded", message: "site did not return valid JSON", ttlSeconds: 120 };
    }
    return body?.site
      ? { state: "ok", ttlSeconds: 120 }
      : { state: "degraded", message: "response carried no `site` object", ttlSeconds: 120 };
  },
};

export default site;
