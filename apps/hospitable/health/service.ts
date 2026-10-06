/**
 * Is the Hospitable Public API up?
 *
 * ## The status page is real (checked 2026-10-06)
 *
 * `status.hospitable.com` is a custom-domain Better Stack page. `/index.json` answers 200 with
 * Better Stack's `{"data": {"type": "status_page", "attributes": {...}}, "included": [...]}`
 * document, and the page self-identifies as `company_name "Hospitable"`, `custom_domain
 * "status.hospitable.com"`, page id `223774`. (The Statuspage-shaped paths — `/api/v2/summary.json`,
 * `/history.atom` — only 301 back to the HTML page.)
 *
 * ## Which component counts
 *
 * The page covers the whole company: five channel APIs (Airbnb, Vrbo, Booking.com, Agoda, Google
 * Vacation Rentals), the web app, inbox, calendar, webhooks and more. Its "Developer Platform"
 * section holds `Public API` (resource id 8821069) and `MCP`. This app calls only the Public API,
 * so that component — matched by id, with the name as a fallback — decides the verdict. The page
 * `aggregate_state` and every other component are shown as detail and never move it.
 *
 * If the `Public API` component cannot be found the check answers `unknown`, never `ok`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.hospitable.com/index.json";
export const PUBLIC_API_RESOURCE_ID = "8821069";

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: { public_name?: string; status?: string };
}

interface BetterStackPage {
  data?: {
    attributes?: { company_name?: string; company_url?: string; custom_domain?: string };
  };
  included?: BetterStackResource[];
}

export function mapResourceStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
    case "resolved":
      return "ok";
    case "degraded":
    case "maintenance":
      return "degraded";
    case "downtime":
    case "down":
      return "down";
    default:
      return "unknown";
  }
}

/** The `Public API` component: pinned by id, falling back to the exact name. */
export function isPublicApi(resource: BetterStackResource): boolean {
  return resource.id === PUBLIC_API_RESOURCE_ID ||
    /^public api$/i.test(resource.attributes?.public_name?.trim() ?? "");
}

function keyOf(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Hospitable Public API status",
  description: "Status of the `Public API` component on status.hospitable.com (Better Stack). " +
    "Other components are shown but do not drive the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.hospitable.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as BetterStackPage | null;
    const attrs = body?.data?.attributes;
    if (!attrs) {
      return { state: "unknown", message: "Status page did not return its JSON document" };
    }
    const identifies = /hospitable/i.test(attrs.company_name ?? "") ||
      /hospitable\.com/i.test(attrs.company_url ?? "") ||
      /hospitable\.com/i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Hospitable's" };
    }

    const resources = (body?.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    const api = resources.find(isPublicApi);
    if (!api) {
      return { state: "unknown", message: "no `Public API` component found on the status page" };
    }

    const components: Record<string, HealthComponentReport> = {};
    resources.forEach((r, i) => {
      const state = mapResourceStatus(r.attributes?.status);
      // Detail only for other components: capped at degraded so they never read as an outage.
      const shown = isPublicApi(r) || state !== "down" ? state : "degraded";
      components[keyOf(r, i)] = shown === "ok" ? { state: shown } : {
        state: shown,
        message: r.attributes?.status,
      };
    });

    const state = mapResourceStatus(api.attributes?.status);
    return {
      state,
      message: state === "ok"
        ? undefined
        : `Public API is ${api.attributes?.status ?? "in an unknown state"}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
