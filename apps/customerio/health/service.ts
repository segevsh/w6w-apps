/**
 * Is Customer.io up? — Atlassian Statuspage.
 *
 *   - `kind: "service"` — a different question from "is this credential live"
 *     (the derived `auth:*` check) or "is there quota left" (declared absent,
 *     see `quota.ts`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection (both regions share one status page), so the host runs
 *     it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.customerio.com is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist is
 *     widened for this one hook only, which the spec permits precisely because
 *     the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * `status.customer.io` 301-redirects to `status.customerio.com` (confirmed
 * live 2026-08-01) — this check calls the canonical host directly, avoiding a
 * redirect the sandbox's network allowlist would otherwise have to permit
 * separately. `summary.json` (rather than `status.json`) carries the
 * per-component breakdown alongside the overall indicator — Customer.io's
 * page tracks 9 components (Javascript Tracker, Data Collection, Data
 * Processing, Message Sending, Management Interface, Knowledge Base, plus a
 * grouped "Third-Party Services" pair) — one call reports all of them at
 * once. Verified live 2026-08-01.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.customerio.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Customer.io platform status",
  description:
    "Atlassian Statuspage rollup for status.customerio.com, with per-component detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      components[slug(c.name)] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    return {
      state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
