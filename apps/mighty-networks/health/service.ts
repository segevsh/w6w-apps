import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * Is Mighty Networks up?
 *
 * `status.mightynetworks.com` is the vendor's own page (verified 2026-10-05, not just a 200):
 * `/api/v2/summary.json` answers `application/json` with `page.name` "Mighty Networks",
 * `page.url` "https://status.mightynetworks.com/", and 25 components that are unmistakably this
 * product (Web App, Search, Custom Domains, **API Access**, iOS, Android, Stripe, Email Delivery,
 * Video, Zoom, …). Unknown paths on the same host answer differently (`/api/v2/notarealthing.json`
 * is a 404 with no body, `/api/v2/status.json` a distinct 219 bytes), so the host routes rather
 * than serving a catch-all. The host does not redirect, so the URL declared here is the one
 * reached. The payload is Atlassian-Statuspage-shaped (`status.indicator`, `components[].status`)
 * but has no `incidents` key; both are tolerated.
 *
 * ## Why the verdict is one component, not the page indicator
 *
 * The page's global indicator also rolls up the iOS/Android apps, Looker, Intercom and the
 * marketing site. None of that stops a workflow calling the Admin API. The verdict therefore
 * follows the **API Access** component; the other components are reported but do not drive it.
 * (`API (Public Network Feed)` is a different surface and is deliberately not used.) If the
 * component disappears the check falls back to the global indicator and says so.
 *
 * `credential: "none"` (default for this kind) is load-bearing: a third-party status host must
 * never see an Admin token. `network.allow` widens egress to the status host for this hook alone.
 */
const STATUS_HOST = "status.mightynetworks.com";

export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

export const PAGE_NAME = "Mighty Networks";

/** The component that stands for the Admin API on the status page. */
export const API_COMPONENT = "api-access";

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
  under_maintenance: "degraded",
  major_outage: "down",
  full_outage: "down",
};

export interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

export interface StatusSummary {
  page?: { id?: string; name?: string };
  status?: { indicator?: string; description?: string };
  components?: StatusComponent[];
  incidents?: unknown[];
  scheduled_maintenances?: unknown[];
}

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function componentState(status: string | undefined): HealthState {
  return COMPONENT[status ?? ""] ?? "unknown";
}

export function indicatorState(indicator: string | undefined): HealthState {
  return INDICATOR[indicator ?? ""] ?? "unknown";
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mighty Networks platform status",
  description:
    "Status page summary for status.mightynetworks.com. The verdict tracks the `API Access` " +
    "component — the surface this app calls — rather than the page-wide indicator, which also " +
    "covers the mobile apps and marketing site. All components are reported.",
  kind: "service",
  scope: "app",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a failing status page says nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body || typeof body !== "object") {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (body.page?.name !== PAGE_NAME) {
      return {
        state: "unknown",
        message: `Status page identifies as "${body.page?.name ?? "nothing"}", not "${PAGE_NAME}"`,
      };
    }

    const all = (body.components ?? []).filter((c) => c.name && !c.group);
    const components: Record<string, HealthComponentReport> = {};
    for (const c of all) {
      const state = componentState(c.status);
      components[slug(c.name!)] = state === "ok" ? { state } : { state, message: c.status };
    }
    if (Object.keys(components).length === 0) {
      return { state: "unknown", message: "Status page returned no named components" };
    }

    const notes: string[] = [];
    const api = components[API_COMPONENT];
    let state: HealthState;
    if (api) {
      state = api.state;
      if (body.status?.description) notes.push(`platform-wide: ${body.status.description}`);
    } else {
      state = indicatorState(body.status?.indicator);
      notes.push(
        "no `API Access` component on the status page — falling back to the platform-wide " +
          "indicator, which also covers the mobile apps and marketing site",
      );
    }

    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");
    if (affected.length > 0) notes.push(`affected: ${affected.map(([id]) => id).join(", ")}`);
    const open = body.incidents?.length ?? 0;
    if (open > 0) notes.push(`${open} open incident(s)`);
    const maintenance = body.scheduled_maintenances?.length ?? 0;
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state: worstHealthState([state]),
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
