/**
 * Is this connection's Sentry install reachable at all?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. For a self-hosted install there is
 *     no vendor platform to be up or down: the tenant's own deployment IS the
 *     dependency. For a SaaS connection it still answers a real, separate
 *     question — can this w6w host reach that regional API host right now —
 *     which `service` (a third-party status page) cannot.
 *   - `scope: "connection"` — each Connection names its own `endpoint`, so
 *     there is no shareable app-wide answer.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call and needs no credential
 *     to interpret the answer, so `sign` must not run.
 *   - No `network.allow` is declared: the install is already reachable under
 *     the app's own `"*"` allowlist, and a `context` check is unsigned anyway.
 *   - `severity` defaults to `degraded` for `dependency`, which is right here:
 *     the derived `auth:*` checks already cover a credential going bad, so this
 *     one stays advisory.
 *
 * Probe: `GET /api/0/organizations/` **without a credential**. Sentry answers
 * `401 {"detail":"Authentication credentials were not provided."}` — verified
 * live on 2026-08-18 against both `us.sentry.io` and `de.sentry.io`. That 401
 * is the signal: it proves something Sentry-shaped is listening and routing the
 * API, without needing a token. A transport failure, a 404 (nothing Sentry-like
 * at that URL), or a 5xx is the install itself being the problem.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PREFIX, resolveBaseUrl, type SentryConnectionDisplay } from "../lib/client.ts";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Install reachable",
  description:
    "Unauthenticated `GET /api/0/organizations/` against this connection's endpoint — a 401 " +
    "proves the API is up without spending a credential.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as SentryConnectionDisplay;
    if (!display.endpoint) return { state: "unknown", message: "connection records no endpoint" };
    const base = resolveBaseUrl(display);

    const res = await ctx.fetch(`${base}${API_PREFIX}/organizations/`, {
      headers: { accept: "application/json" },
    });
    // 401/403 is the healthy answer for an unsigned probe: the API is there and
    // it is enforcing auth.
    if (res.status === 401 || res.status === 403) return { state: "ok", ttlSeconds: 120 };
    if (res.status === 404) {
      return { state: "down", message: "endpoint does not look like a Sentry install (404)" };
    }
    if (res.status >= 500) return { state: "down", message: `install returned ${res.status}` };
    if (!res.ok) {
      return { state: "degraded", message: `install returned ${res.status}`, ttlSeconds: 120 };
    }
    // A 2xx to an unauthenticated call is unusual but not a fault — some
    // self-hosted deployments sit behind a proxy that answers for them.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default site;
