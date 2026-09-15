/**
 * Is `api-v2.mindee.net` up?
 *
 * ## The status page is real, and covers more than this app calls
 *
 * Mindee publishes an Atlassian Statuspage at **`status.mindee.com`**
 * (`page.id` `4twbvfmnmm9c`, `page.name` "Mindee" — genuinely claimed, not the
 * unconfigured-defaults or unclaimed-decoy pattern seen elsewhere in this
 * pack). Measured live on 2026-09-15, `/api/v2/summary.json` lists **seven**
 * components: two group containers ("Mindee V1", "Mindee V2") and five leaves
 * — `API V1 (api.mindee.net)`, `Platform V1 (platform.mindee.net)`,
 * `API V2 (api-v2.mindee.net)`, `Website`, and `Platform V2 (app.mindee.com)`.
 *
 * This app only ever calls `api-v2.mindee.net`. The page-level `status.indicator`
 * rolls up all seven, so trusting it (the way most single-product apps in this
 * pack do) would report this app degraded over a Platform-UI or legacy-V1
 * incident that never touches its own traffic. This check instead reads
 * **only** the `API V2 (api-v2.mindee.net)` component (id `7hyjmkw09n77`,
 * confirmed stable across measurements) — a genuine per-service breakdown, not
 * a generic "all systems operational" rollup.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Mindee API key.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.mindee.com/api/v2/summary.json";

/** Stable per Statuspage semantics (ids do not change on rename); measured 2026-09-15. */
export const API_V2_COMPONENT_ID = "7hyjmkw09n77";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
}

/** Statuspage's documented component vocabulary. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mindee API V2 status",
  description:
    "Component status from status.mindee.com, scoped to the API V2 (api-v2.mindee.net) " +
    "component this app calls — deliberately NOT the page-level indicator, which also covers " +
    "the unrelated legacy V1 API/Platform and the app.mindee.com Platform UI.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.mindee.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Mindee — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand pointing this probe at
    // someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.mindee\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Mindee's" };
    }

    const component = (body.components ?? []).find((c) => c?.id === API_V2_COMPONENT_ID);
    if (!component) {
      return { state: "unknown", message: "Status page no longer lists the API V2 component" };
    }

    const state = mapComponentStatus(component.status);
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [
      state === "ok" ? (component.name ?? "API V2") : `${component.name}: ${component.status}`,
    ];
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s) page-wide`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s) page-wide`);

    return {
      state,
      message: notes.join("; "),
      components: { [API_V2_COMPONENT_ID]: { state, message: component.name } },
      ttlSeconds: 60,
    };
  },
};

export default service;
