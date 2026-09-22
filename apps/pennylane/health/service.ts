/**
 * Is Pennylane up?
 *
 * ## The status page is real, and it was checked live on 2026-09-22
 *
 * Pennylane publishes at **`status.pennylane.com`**, an Atlassian Statuspage.
 * `https://status.pennylane.com/api/v2/summary.json` answered `200`,
 * `application/json; charset=utf-8`, 2,826 bytes, and self-identifies:
 *
 *     "page": { "id": "bgttfstd0mbz", "name": "Pennylane",
 *               "url": "https://status.pennylane.com" }
 *
 * `pennylane.statuspage.io` 302-redirects to the same page — the same
 * deployment, not a decoy second one.
 *
 * ## The verdict follows the `API` component, and the page roll-up can only escalate
 *
 * The page carries seven components, and only one of them speaks for the host
 * this app calls:
 *
 *     Application (app.pennylane.com)      c9ntgd50fyqs
 *     API (app.pennylane.com/api)          nm672smys1j9   ← the verdict
 *     Mobile application                   dtcwfrlql57p
 *     Landing page (www.pennylane.com)     6p29f82gjy1y
 *     Help Center (help.pennylane.com)     ktv9hvslxk15
 *     Academy (academy.pennylane.com)      lzn4f43zp5xp
 *     Customer support                     bsz8ll87ww42
 *
 * The other six say nothing about `app.pennylane.com/api`: the marketing site,
 * the help centre and the mobile app all fail independently of the API, and a
 * verdict derived from the page-wide roll-up would report this API down for a
 * landing-page incident. So the state comes from the component with id
 * `nm672smys1j9` (matched by id first, and by its exact name as a fallback,
 * because a page can re-create a component under a new id), mapped through
 * `mapComponentStatus`.
 *
 * The page-level `status.indicator` is read too, but it can only ever make the
 * verdict **worse**, never better: Pennylane's own roll-up aggregates every
 * component, so a `critical` indicator with a healthy-looking `API` row is
 * evidence that something this component does not model is badly wrong, and a
 * workflow is better served by caution than by a confident `ok`. The escalation
 * is named in the message so it is visible rather than mysterious.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Pennylane is SaaS-only —
 * there is no self-hosted Pennylane — so every Connection this app can hold runs
 * on exactly the infrastructure this component describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below: a
 * status host must never see a Pennylane access token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.pennylane.com/api/v2/summary.json";

/** The page's own identity, so a redirect to someone else's page is caught. */
export const STATUS_HOST = "status.pennylane.com";

/** The component this probe speaks for — `API (app.pennylane.com/api)`. */
export const API_COMPONENT_ID = "nm672smys1j9";

/** Exact-name fallback, in case the page re-creates the component under a new id. */
export const API_COMPONENT_NAME = "API (app.pennylane.com/api)";

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
 * Deliberately not a substring match: `Application (app.pennylane.com)` must
 * never be mistaken for `API (app.pennylane.com/api)`.
 */
export function findApiComponent(
  components: StatusComponent[],
): StatusComponent | undefined {
  return components.find((c) => c.id === API_COMPONENT_ID) ??
    components.find((c) =>
      (c.name ?? "").trim().toLowerCase() === API_COMPONENT_NAME.toLowerCase()
    );
}

/** Key a component by the vendor's id, falling back to a slug of the name. */
function componentKey(component: StatusComponent, index: number): string {
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
  title: "Pennylane API status",
  description:
    "The `API (app.pennylane.com/api)` component on status.pennylane.com — the component that " +
    "speaks for the host this app calls. The other six components (application, mobile app, " +
    "landing page, help centre, academy, support) are reported as detail and never drive the " +
    "verdict; a worse page-level indicator can only escalate it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Pennylane — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.pennylane\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Pennylane's" };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; reporting them would double-count.
    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const api = findApiComponent(nodes);
    if (!api) {
      return {
        state: "unknown",
        message:
          "status.pennylane.com no longer publishes an `API (app.pennylane.com/api)` component",
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

    const apiState = mapComponentStatus(api.status);
    // The page roll-up may escalate the verdict, never soften it — see the
    // header. `worstHealthState` ranks `unknown` above `ok`, so an unreadable
    // indicator cannot silently pass as healthy either.
    const pageState = mapIndicator(body.status?.indicator);
    const state = worstHealthState([apiState, pageState]);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");

    const notes: string[] = [];
    if (apiState !== "ok") notes.push(`${api.name}: ${api.status ?? "status not reported"}`);
    if (pageState !== "ok" && (apiState === "ok" || state !== apiState)) {
      notes.push(
        `page-level indicator: ${body.status?.description ?? body.status?.indicator}` +
          (apiState === "ok" ? " (escalated from the roll-up)" : ""),
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
