/**
 * Is Clerk itself up? — a real, dedicated Atlassian Statuspage instance.
 *
 * Verified live 2026-09-15: `GET https://status.clerk.com/api/v2/summary.json` answers 200 with
 * `page.name: "Clerk"`, `page.url: "https://status.clerk.com/"`, and real named components
 * ("Email delivery", "Webhooks", "Machine authentication", …) — not a generic template or a decoy
 * page returning a fixed byte count for every path.
 *
 * `kind: "service"`, `scope: "app"` (one answer, shared across every Connection),
 * `credential: "none"` (unsigned — this reports even before anyone has connected).
 * `status.clerk.com` is intentionally NOT on the app's `network.allow`: an Action has no business
 * calling it, so the allowlist is widened for this hook only, which the spec permits precisely
 * because the posture here is unsigned.
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

const STATUS_HOST = "status.clerk.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Clerk platform status",
  description:
    "Atlassian Statuspage rollup for status.clerk.com, with per-component detail. Unauthenticated " +
    "and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing about the
    // vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
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
