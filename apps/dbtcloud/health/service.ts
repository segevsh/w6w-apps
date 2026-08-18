/**
 * Is dbt Cloud up? — its Statuspage, read from the overall indicator.
 *
 * ## Why this reads `status.json` and not `components.json`
 *
 * `status.getdbt.com` is a real Statuspage instance — measured 2026-08-18, its
 * `page` block is `{"id":"01JBH53RGT63T7EM45RY826C4H","name":"dbt Cloud",…}` —
 * but **`components.json` returns `{"components":[]}`**. dbt publishes no
 * components at all, so the per-component reading every other Statuspage app in
 * this pack does would report nothing here, and a check that finds no watched
 * component would report `unknown` forever.
 *
 * What the page does publish is the roll-up indicator, and that is what this
 * reads. It is coarser — an incident cannot be attributed to the API rather
 * than the IDE — but it is the whole of what the vendor says.
 *
 * The check keeps looking at `components` anyway: if dbt ever populates them,
 * they are reported as components alongside the verdict rather than silently
 * ignored.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.getdbt.com";

/** Statuspage's four indicators, mapped onto our states. */
const INDICATORS: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
  maintenance: "degraded",
};

const COMPONENT_STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "dbt Cloud platform status",
  description:
    "The overall indicator from dbt's Statuspage — which is all it publishes, since its " +
    "components list is empty.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
      incidents?: Array<{ name?: string; status?: string }>;
    } | null;

    const indicator = body?.status?.indicator;
    if (!indicator) {
      return { state: "unknown", message: "status page returned no overall indicator" };
    }
    const state = INDICATORS[indicator] ?? "unknown";

    // Empty today. Reported if dbt ever fills them in, rather than dropped.
    const components: Record<string, { state: HealthState; message?: string }> = {};
    for (const c of body?.components ?? []) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      if (!name) continue;
      components[slug(name)] = {
        state: COMPONENT_STATES[String(c.status)] ?? "unknown",
        message: c.status,
      };
    }

    const open = (body?.incidents ?? []).filter((i) => i.status !== "resolved");
    const message = body?.status?.description ??
      (open.length > 0 ? open.map((i) => i.name).join("; ") : indicator);

    return {
      state,
      message,
      components: Object.keys(components).length > 0 ? components : undefined,
      ttlSeconds: 120,
    };
  },
};

export default service;
