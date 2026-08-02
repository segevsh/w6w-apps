/**
 * Is Postmark up? — a real, machine-readable JSON status API, but not the
 * Atlassian Statuspage shape most vendors in this pack publish.
 *
 * Verified live 2026-08-02: `GET https://status.postmarkapp.com/api/v1/status`
 * returns `{"page": {"state": "operational" | "degraded" | "under_maintenance", ...}}`
 * (footer reads "Powered by Sorry™" — the Sorry status-page product, not
 * Statuspage). There is no `/api/v2/summary.json` Statuspage-compatible
 * endpoint. A companion `GET /api/v1/components` lists 19 named components
 * (API, SMTP, Inbound, Webhooks, Web App, ...) each with the same tri-state
 * vocabulary; this check folds their names into `components` so a host can
 * attribute a `degraded` verdict to (say) Webhooks without Sending being
 * implicated.
 *
 * Annotation:
 *   - `kind: "service"` — a different question from credential liveness
 *     (derived `auth:api-key`) or quota (`quota`, declared unavailable below).
 *   - `scope: "app"` (default for this kind) — identical for every
 *     Connection; the host runs it once and shares the result.
 *   - `credential: "none"` (default) — no Connection needed; reports before
 *     anyone has connected.
 *   - `network.allow` — status.postmarkapp.com is deliberately NOT on the
 *     app's main egress allowlist (no action has business calling it); this
 *     check widens egress for its own unsigned probe only.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.postmarkapp.com";

/** Postmark's tri-state page/component vocabulary — no "critical" tier. */
const STATE: Record<string, HealthState> = {
  operational: "ok",
  degraded: "degraded",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Postmark platform status",
  description:
    "status.postmarkapp.com's own JSON status API (/api/v1/status + /api/v1/components), with " +
    "per-component detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v1/status`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      page?: { state?: string; state_text?: string };
    };
    const state = STATE[body.page?.state ?? ""] ?? "unknown";

    const componentsRes = await ctx.fetch(`https://${STATUS_HOST}/api/v1/components`);
    const components: Record<string, { state: HealthState }> = {};
    if (componentsRes.ok) {
      const list = await componentsRes.json().catch(() => []) as Array<
        { name?: string; state?: string }
      >;
      for (const c of Array.isArray(list) ? list : []) {
        if (!c.name) continue;
        components[slug(c.name)] = { state: STATE[c.state ?? ""] ?? "unknown" };
      }
    }

    return {
      state,
      message: body.page?.state_text,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
