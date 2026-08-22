/**
 * Is this connection's Confluence site reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — the vendor platform is covered by `service`
 *     (confluence.status.atlassian.com). This is the narrower question of
 *     whether THIS tenant's site answers, which a cross-product status page
 *     cannot tell you.
 *   - `scope: "connection"` — every Connection points at a different site.
 *   - `credential: "context"` — the posture a boolean would lose. Jira — this app's
 *     sibling — is the motivating case in the spec, and Confluence has the
 *     same shape: this app's two auth methods address
 *     different hosts, and an OAuth connection has no site URL at all until its
 *     token resolves one. So the URL comes from the Connection's display data,
 *     and no credential is needed to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.atlassian.net` is already on the app's
 *     allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * `GET /status` is Atlassian Cloud's unauthenticated liveness endpoint; it
 * returns a small JSON document with a `state` of `RUNNING`, `MAINTENANCE`,
 * `ERROR` and so on. Probing it separates "the site is suspended, renamed or
 * gone" from "the credential expired", which the derived `auth:*` check
 * already reports and which is a very different fix.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** Atlassian Cloud's site states, mapped onto our four. */
const STATE: Record<string, HealthState> = {
  RUNNING: "ok",
  FIRST_RUN: "degraded",
  STARTING: "degraded",
  MAINTENANCE: "degraded",
  STOPPING: "down",
  ERROR: "down",
};

const site: HealthCheckDefinition = {
  key: "site",
  title: "Confluence site reachable",
  description:
    "Unauthenticated `GET /status` against this connection's Atlassian site — proves the site exists and is serving.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential. The
    // api-token method records a bare site name; OAuth records a resolved URL.
    const display = (ctx.connection?.display ?? {}) as { site?: string; siteUrl?: string };
    const base = display.siteUrl?.replace(/\/+$/, "") ??
      (display.site ? `https://${display.site}.atlassian.net` : undefined);
    if (!base) {
      return {
        state: "unknown",
        message:
          "connection records no site — an OAuth connection resolves one only after its first token",
      };
    }

    const res = await ctx.fetch(`${base}/status`);
    if (!res.ok) return { state: "down", message: `site returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as { state?: string };
    if (!body.state) return { state: "ok", message: "site answered", ttlSeconds: 120 };

    return {
      state: STATE[body.state] ?? "degraded",
      message: `site state: ${body.state}`,
      ttlSeconds: 120,
    };
  },
};

export default site;
