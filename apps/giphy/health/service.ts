/**
 * Is GIPHY up?
 *
 * ## The status page is real
 *
 * GIPHY publishes at **`https://status.giphy.com`**, a genuine Statuspage
 * instance (Atlassian-shaped, but GIPHY's own page, not a catch-all): verified
 * on 2026-09-22, `GET /api/v2/summary.json` returned a page whose `page.name` is
 * `"GIPHY"` with GIPHY's own components, including the API-group components
 * this app's actions actually call — `Search`, `Trending`, `Translate`,
 * `Random`, `Media`, `Upload`, `Developers` and `API`.
 *
 * ## Why only the API group is reported
 *
 * The page also carries a **`Web & Mobile`** group for giphy.com itself. An
 * incident on the website is not an incident on `api.giphy.com`, so those
 * components are deliberately left out of the report: a workflow reading this
 * check should see the state of the services its own actions depend on, not the
 * state of a page nobody's step calls. The group is located by name and its
 * children are taken from `group_id`, so the selection follows the vendor's own
 * grouping rather than a hard-coded list; the documented names are the fallback
 * for a page that stops stating group ids.
 *
 * ## The page-level indicator is the verdict
 *
 * `status.indicator` is GIPHY's own roll-up, and it is the field this check
 * leads with. It is mapped exactly as the vendor documents it: `none` → `ok`,
 * `minor` → `degraded`, `major`/`critical` → `down`. Statuspage's fifth value,
 * `maintenance`, is mapped to `degraded` too — it was not observed on GIPHY's
 * page when this app was verified, but it is part of the vocabulary the page
 * serves from, and a maintenance window is not a healthy vendor.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. GIPHY is SaaS-only —
 * there is no self-hosted GIPHY to be up while the vendor is down — so an
 * incident on this page is evidence about every Connection this app can hold.
 * This is a real feed, so it is a real check, not an `informational` declared
 * absence.
 *
 * `credential: "none"` is stated explicitly because it is the precondition for
 * the `network` widening below: a status host must never see an API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.giphy.com/api/v2/summary.json";

/** The group whose components this app's actions call. */
export const API_GROUP_NAME = "API";

/**
 * The documented API-group component names, used only when the page states no
 * `group_id` to follow.
 */
export const API_COMPONENT_NAMES = [
  "search",
  "trending",
  "translate",
  "random",
  "media",
  "upload",
  "developers",
  "api",
];

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

/**
 * Statuspage's documented component vocabulary: `operational`,
 * `degraded_performance`, `partial_outage`, `major_outage`,
 * `under_maintenance`.
 */
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

/** The page-level roll-up: `none`, `minor`, `major`, `critical` (and `maintenance`). */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "maintenance":
      return "degraded";
    case "major":
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/**
 * The components this app speaks for: the API group, never the website.
 *
 * Located by the group component's own name, then by its id, so a rename of the
 * individual children does not silently widen the report; falls back to the
 * documented names when the page carries no group ids at all.
 */
export function apiComponents(components: StatusComponent[]): StatusComponent[] {
  const nodes = components.filter((c) => c?.name && c.group !== true);
  const group = components.find(
    (c) =>
      c?.group === true && (c.name ?? "").trim().toLowerCase() === API_GROUP_NAME.toLowerCase(),
  );
  if (group?.id) {
    const children = nodes.filter((c) => c.group_id === group.id);
    if (children.length > 0) return children;
  }
  return nodes.filter((c) => API_COMPONENT_NAMES.includes((c.name ?? "").trim().toLowerCase()));
}

/**
 * Key a component by the vendor's id, falling back to a slug of the name.
 *
 * The id is stable across renames and is what the page's own incident records
 * reference. The fallback exists only so a page that drops ids still reports
 * something rather than silently dropping rows.
 */
export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    return `${component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` +
      `-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "GIPHY platform status",
  description:
    "Component status from status.giphy.com. Reports the API group — Search, Trending, " +
    "Translate, Random, Media, Upload, Developers and API — not the Web & Mobile group, which " +
    "describes giphy.com rather than api.giphy.com.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.giphy.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about GIPHY — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product.
    const pageName = body.page?.name ?? "";
    const pageUrl = body.page?.url ?? "";
    if (
      pageName && pageName.toLowerCase() !== "giphy" &&
      !/(^|\/\/|\.)status\.giphy\.com(\/|$)/i.test(pageUrl)
    ) {
      return { state: "unknown", message: "status page no longer self-identifies as GIPHY's" };
    }

    const nodes = apiComponents(body.components ?? []);
    if (nodes.length === 0) {
      return {
        state: "unknown",
        message: "Status page returned no components for GIPHY's API group",
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which component this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
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
