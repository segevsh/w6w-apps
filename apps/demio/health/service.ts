import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Is Demio up? — Atlassian Statuspage, verified live 2026-10-05.
 *
 * `status.demio.com/api/v2/summary.json` answers `page.id: "02cw9qfm3jdr"`, `page.name:
 * "Demio"` and the same page serves from `demio.statuspage.io` (so it is the claimed page, not
 * an unclaimed decoy). No component is named for the public REST API: `Webinar Room API` is the
 * in-room service, and two components both called `API` sit under `Billing/Subscriptions` and
 * `Video Streaming`. The public API is served from `my.demio.com`, the same host as the
 * dashboard, so the verdict comes from the `User Dashboard` component — an inference, which is
 * why the check is `informational`. The page-level indicator is NOT used: it rolls in a dozen
 * AWS and mailgun components that say nothing about this API.
 */
const STATUS_HOST = "status.demio.com";
const PAGE_ID = "02cw9qfm3jdr";
const VERDICT_COMPONENT = "User Dashboard";

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "Demio platform status",
  description:
    `Statuspage for ${STATUS_HOST}, read from the "${VERDICT_COMPONENT}" component (served from ` +
    "the same my.demio.com host as the API). Demio names no component for the public API itself.",
  kind: "service",
  covers: ["*"],
  credential: "none",
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };
    const body = await res.json().catch(() => ({})) as {
      page?: { id?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page is not the expected Demio page" };
    }
    const target = (body.components ?? []).find((c) => !c.group && c.name === VERDICT_COMPONENT);
    if (!target) {
      return { state: "unknown", message: `component "${VERDICT_COMPONENT}" not found` };
    }
    const state = COMPONENT[target.status ?? ""] ?? "unknown";
    return {
      state,
      message: `${VERDICT_COMPONENT}: ${target.status}`,
      components: { "user-dashboard": { state } },
      ttlSeconds: 60,
    };
  },
};

export default service;
