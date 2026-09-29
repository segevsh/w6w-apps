/**
 * Is Paperform up? — Atlassian Statuspage.
 *
 * `paperform.statuspage.io/api/v2/summary.json`, verified live on 2026-09-29:
 * `page.name` is `"Paperform"` and `page.url` is `"https://paperform.statuspage.io"` — this
 * page self-identifies correctly, unlike this pack's `fillout` app (whose Statuspage instance
 * is branded for a different product name). It carries a component literally named `"API"`,
 * plus `Paperform Dashboard`, `Forms`, `Submission Processing (Emails, Webhooks,
 * Integrations)` — all this app's own surface — and a `Stepper` GROUP (a separate, newer
 * Paperform product) whose three children are skipped by name, same as any other
 * `group: true` row, but called out because a careless reader could mistake "Stepper" for
 * something this app depends on.
 *
 * `kind: "service"`, `scope: "app"` (default) and `credential: "none"` (default) — the
 * answer is identical for every Connection and needs none to compute, so the host runs it
 * once and shares the result; `status.indicator` is the vendor's own roll-up, trusted over a
 * locally recomputed worst-component fold for the reasons this pack's other Statuspage-backed
 * checks already document.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** Statuspage's four rollup indicators. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const STATUS_HOST = "paperform.statuspage.io";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

/** The page's own id — pinned so a future unrelated page swap is caught, not trusted blindly. */
export const STATUS_PAGE_NAME = "Paperform";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Paperform platform status",
  description:
    "Atlassian Statuspage rollup for paperform.statuspage.io — API, Dashboard, Forms and " +
    "submission processing components. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails tells us nothing about the
    // vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => null) as {
      page?: { name?: string };
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    } | null;
    if (!body) return { state: "unknown", message: "status page returned an unreadable body" };

    if (body.page?.name && body.page.name !== STATUS_PAGE_NAME) {
      return {
        state: "unknown",
        message: `status page self-identifies as "${body.page.name}", not "${STATUS_PAGE_NAME}"`,
      };
    }

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state. Paperform's page
      // currently has one: "Stepper", a separate product this app does not call.
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
