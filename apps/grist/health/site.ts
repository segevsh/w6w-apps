/**
 * Is this connection's Grist server up, and is its database behind it?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. Half the Connections this app will
 *     ever hold point at a Grist the tenant runs themselves; availability is a
 *     property of *their* infrastructure, not of a vendor platform. The hosted
 *     case is the same code on someone else's machine, so it takes the same
 *     probe.
 *   - `scope: "connection"` — every Connection carries its own `siteUrl`
 *     (`docs.getgrist.com`, `<team>.getgrist.com`, or a private origin), so
 *     there is no shareable app-wide answer to cache.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call and needs no credential to
 *     interpret the answer, so `sign` must not run. `/status` is unauthenticated
 *     by design; sending a bearer token to it would be gratuitous exposure.
 *   - No `network.allow`: the site is already reachable under the app's own
 *     allowlist (`*`), and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind, which is right: the
 *     derived `auth:*` check already covers a credential that has stopped
 *     working, so this one stays advisory.
 *
 * ### Why `/status`, and why `?db=1` and nothing else
 *
 * `GET <site>/status` is grist-core's own health endpoint — the same handler on
 * hosted and self-hosted, unauthenticated, and the thing a Kubernetes probe
 * would point at. Its source (`app/server/lib/FlexServer.ts`, the
 * `/status(/hooks)?` route) decides the whole contract:
 *
 *   - each `?<name>=1` query flag adds one sub-check, and the flags that pass
 *     are reported inline: `Grist server(home) is alive (db ok).`
 *   - if ANY requested sub-check fails, the whole response becomes **HTTP 500**
 *     `Grist server(home) is unhealthy (db not ok).`
 *
 * That second rule is why this probe asks for `db=1` **only**. The obvious
 * richer call, `?db=1&redis=1`, works on the hosted service and would report
 * every ordinary single-container self-hosted install as DOWN: the handler runs
 * `this._docWorkerMap.getRedisClient()?.pingAsync()`, an unconfigured Redis
 * yields `undefined`, `undefined` counts as a failed check, and the server
 * answers 500 — while being perfectly healthy. A probe whose failure mode is
 * "correctly configured server, reported dead" is worse than a coarser probe.
 * `db` has no such hole: every Grist deployment has a home database (SQLite or
 * Postgres) by construction.
 *
 * All four behaviours were confirmed on the wire against docs.getgrist.com on
 * 2026-08-03:
 *
 *   GET /status              → 200 "Grist server(home) is alive."
 *   GET /status?db=1         → 200 "Grist server(home) is alive (db ok)."
 *   GET /status?db=1&redis=1 → 200 "Grist server(home) is alive (db ok, redis ok)."
 *   GET /status/hooks        → 500 "Grist server(home) is unhealthy (hooks not ok)."
 *
 * The last one is the useful one: it proves the 500 branch is reachable and that
 * this path is a real handler with real semantics, not a 200-everything
 * catch-all. (`/status/hooks` is a test-harness gate and is never healthy in
 * production — it is probed here as evidence, never used as the check.)
 */
import type { HealthCheckDefinition, HealthComponentReport } from "@w6w/types";
import type { GristConnectionDisplay } from "../lib/client.ts";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Grist server reachable",
  description:
    "Unauthenticated `GET <site>/status?db=1` against this connection's Grist server — proves the host resolves, the app is serving, and its home database answers.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as GristConnectionDisplay;
    const siteUrl = display.siteUrl?.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
    if (!siteUrl) return { state: "unknown", message: "connection records no site URL" };

    const res = await ctx.fetch(`${siteUrl}/status?db=1`);
    const body = await res.text().catch(() => "");
    const components = parseComponents(body);

    if (res.status >= 500) {
      return {
        state: "down",
        message: summarize(body) ?? `server returned ${res.status}`,
        components,
        ttlSeconds: 120,
      };
    }
    if (res.status === 404) {
      // Something is answering on this origin, but it is not a Grist server —
      // a wrong URL, or a proxy that swallowed the path.
      return {
        state: "down",
        message: "no /status endpoint here — is this URL really a Grist server?",
        ttlSeconds: 120,
      };
    }
    if (!res.ok) {
      return {
        state: "degraded",
        message: `status endpoint returned ${res.status}`,
        ttlSeconds: 120,
      };
    }
    // A 200 that does not say "alive" means something else is serving this path.
    if (!/is alive/i.test(body)) {
      return {
        state: "unknown",
        message: "unrecognised /status response",
        components,
        ttlSeconds: 120,
      };
    }
    return { state: "ok", message: summarize(body), components, ttlSeconds: 120 };
  },
};

/**
 * Pull the inline sub-check results out of the plain-text body.
 *
 * The format is fixed by the server: ` (db ok, redis not ok)`. Anything absent
 * simply is not reported — "we did not ask" and "it failed" must not collapse
 * into the same component state.
 *
 * The regex is anchored at the END for a reason: the server's own name contains
 * parentheses (`Grist server(home) is alive (db ok).`), so a first-match regex
 * would happily parse `home` and find no components at all.
 */
export function parseComponents(body: string): Record<string, HealthComponentReport> | undefined {
  const match = /\(([^()]*)\)\s*\.?\s*$/.exec(body.trim());
  if (!match) return undefined;
  const components: Record<string, HealthComponentReport> = {};
  for (const part of match[1].split(",")) {
    const m = /^\s*(\S+)\s+(ok|not ok)\s*$/.exec(part);
    if (!m) continue;
    components[m[1]] = { state: m[2] === "ok" ? "ok" : "down" };
  }
  return Object.keys(components).length > 0 ? components : undefined;
}

/** The server's own sentence, trimmed — it is short, exact and safe to render. */
function summarize(body: string): string | undefined {
  const line = body.trim().split("\n")[0]?.trim();
  if (!line || line.length > 200) return undefined;
  return line;
}

export default site;
