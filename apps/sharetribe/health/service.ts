/**
 * Is Sharetribe up?
 *
 * ## The status page is real, and was checked three ways on 2026-09-29
 *
 * Sharetribe publishes at **`status.sharetribe.com`**, an Atlassian Statuspage (confirmed
 * against the `sharetribe.statuspage.io` canonical host too, same content).
 *
 * **(a) Genuinely claimed, not a catch-all.** `/api/v2/summary.json` answers `200` with 8,067
 * bytes of Statuspage v2 JSON; a nonsense path under the same page answers `404`.
 *
 * **(b) Content matches.** `page.name` is `"Sharetribe"`, `page.url` is
 * `https://status.sharetribe.com`.
 *
 * **(c) It names this app's own API surface.** Four of its components are, verbatim:
 * `Marketplace API`, `Integration API`, `Authentication API`, `Asset Delivery API` — every host
 * this app declares in `network.allow` has a named, ungrouped component on this page.
 *
 * ## What's on the page that this app does NOT cover
 *
 * The remaining components split into two groups this app has no stake in: `3rd Party Services`
 * (Chargebee billing, Intercom support widgets/APIs, SendGrid outbound email — all genuinely
 * upstream of *Sharetribe the company*, not of the APIs this app calls) and standalone
 * "3rd Party Services - Sharetribe subscriptions and customer support" duplicates, plus
 * `Image Storage - AWS S3`/`imgix` (asset rendering infra behind Sharetribe's own web client, not
 * behind the Asset Delivery API JSON responses this app reads) and `No-code marketplace web
 * sites[with custom domain]` (Sharetribe's own no-code product, not this API). Reported for
 * completeness, keyed by the vendor's own component id so `Image Storage - AWS S3` is never
 * mistaken for this app's own API surface by a reader skimming names — same discipline as this
 * pack's `apify` app.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. There is no self-hosted Sharetribe —
 * every marketplace this app can hold a Connection to runs on exactly the multi-tenant
 * infrastructure this page describes.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.sharetribe.com/api/v2/summary.json";

/** Component ids this app's own `network.allow` surface corresponds to. */
export const COVERED_COMPONENT_NAMES = new Set([
  "Marketplace API",
  "Integration API",
  "Authentication API",
  "Asset Delivery API",
]);

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
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

/** The page-level roll-up: `none`, `minor`, `major`, `critical`, `maintenance`. */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    return `${
      component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Sharetribe platform status",
  description: "Component status from status.sharetribe.com, covering the Marketplace, " +
    "Integration, Authentication and Asset Delivery APIs plus Sharetribe's own dependencies.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.sharetribe.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.sharetribe\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Sharetribe's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      const covered = COVERED_COMPONENT_NAMES.has(node.name ?? "");
      const label = covered ? node.name : `${node.name} (not part of this app's API surface)`;
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: label }
        : { state, message: `${label}: ${node.status}` };
    });

    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
