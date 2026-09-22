import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Squarespace Commerce up?
 *
 * ## The status page is real, and it was checked live on 2026-09-22
 *
 * Squarespace publishes at **`status.squarespace.com`**, an Atlassian
 * Statuspage. Its `GET /api/v2/summary.json` answered `200`,
 * `application/json`, 7,288 bytes, self-identifying:
 *
 *     "page": { "id": "1jkhm1drpysj", "name": "Squarespace",
 *               "url": "https://status.squarespace.com" }
 *
 * and carrying thirteen top-level components: `Site Loading`, `Site Editing`,
 * **`Commerce`** (id `qgtfn3dyv6pl`), `Domains`, `Email Campaigns`,
 * `Acuity Scheduling`, `Accounts & Billing`, `Analytics`, `Google Workspace`,
 * `Third Party Services`, `Developer Platform`, `Squarespace Help` and `Forum`.
 *
 * ## The verdict follows the `Commerce` component, never the page indicator
 *
 * That is the entire point of matching a component here, and the live feed on
 * the day of the check made the case for it: the page-level `status.indicator`
 * was **`minor`** ("Minor Service Outage") while `Commerce` was **`operational`**
 * — the degradation was `Acuity Scheduling`. Reporting this app degraded because
 * Squarespace's scheduling product was having a bad afternoon would be wrong
 * about every Connection it holds; the app calls `api.squarespace.com/commerce/…`
 * and nothing else.
 *
 * So the state comes from the component named `Commerce`, matched by the page's
 * own id first and by exact name as a fallback (a page can re-create a component
 * under a new id), and the page-level roll-up is *named in the message* when it
 * is worse without ever changing the verdict.
 *
 * ## Severity is `informational`, deliberately
 *
 * Two reasons, and both are about not lying:
 *
 *  1. This page describes the whole Squarespace platform — the marketing site,
 *     the editor, domains, email campaigns, the help forum — of which the
 *     Commerce API is one component. Its roll-up is weak evidence even when the
 *     component match is exact: an incident on `Site Loading` cannot make
 *     `api.squarespace.com` fail, and a status page that mislabels its own
 *     components is not a statement this app should escalate fatally.
 *  2. When the status feed itself is **unreachable** (this hook's own fetch fails,
 *     or the page stops publishing a `Commerce` component) the check reports
 *     `unknown`, and `unknown` outranks `ok` in a roll-up. At any other severity
 *     that would pin the app's verdict at `unknown` for as long as the feed
 *     misbehaved — a status source must never be able to *create* permanent
 *     uncertainty about the thing it describes.
 *
 * The credential half of the health surface needs nothing here: the auth
 * method's `test` hook is projected automatically as the derived `auth:api-key`
 * check.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see an API key.
 */
export const STATUS_URL = "https://status.squarespace.com/api/v2/summary.json";

/** The component this probe speaks for: "Commerce", verified live 2026-09-22. */
export const COMMERCE_COMPONENT_ID = "qgtfn3dyv6pl";

/** Name fallback, in case the page re-creates the component under a new id. */
export const COMMERCE_COMPONENT_NAME = "Commerce";

/** The page's own identity, so a redirect or rebrand cannot silently point this at someone else. */
export const STATUS_HOST = "status.squarespace.com";

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

/**
 * Find the component this check speaks for.
 *
 * Id first — it survives a rename — then the exact name, case-insensitively.
 * Deliberately not a substring match: nothing else on this page may be mistaken
 * for `Commerce`.
 */
export function findCommerceComponent(
  components: StatusComponent[],
): StatusComponent | undefined {
  return components.find((c) => c.id === COMMERCE_COMPONENT_ID) ??
    components.find((c) =>
      (c.name ?? "").trim().toLowerCase() === COMMERCE_COMPONENT_NAME.toLowerCase()
    );
}

/** Key a component by the vendor's id, falling back to a slug of the name. */
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
  title: "Squarespace Commerce status",
  description:
    "The `Commerce` component on status.squarespace.com — the component that speaks for " +
    "api.squarespace.com's commerce routes. The page's other twelve components (Site Loading, " +
    "the editor, Domains, Email Campaigns, Acuity Scheduling, …) are reported as detail but " +
    "never drive the verdict, and the page-level indicator is only ever named.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  // Informational — see this file's header. The page covers the whole platform,
  // and an unreachable feed must not pin the app at `unknown` forever.
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Squarespace Commerce — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.squarespace\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Squarespace's",
      };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; this page has none today, but reporting them would double-count.
    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const commerce = findCommerceComponent(nodes);
    if (!commerce) {
      return {
        state: "unknown",
        message: "status.squarespace.com no longer publishes a `Commerce` component",
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

    const state = mapComponentStatus(commerce.status);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");

    const notes: string[] = [];
    if (state !== "ok") notes.push(`Commerce: ${commerce.status}`);
    // The page roll-up is not the verdict — but it is worth naming, so an `ok`
    // verdict does not hide a Site Loading or Acuity incident from the reader.
    const pageState = mapIndicator(body.status?.indicator);
    if (pageState !== "ok" && pageState !== "unknown") {
      notes.push(
        `page-level indicator: ${body.status?.description ?? body.status?.indicator}`,
      );
    }
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    const openIncidents = body.incidents?.length ?? 0;
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    const maintenance = body.scheduled_maintenances?.length ?? 0;
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
