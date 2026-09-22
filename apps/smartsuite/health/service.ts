/**
 * Is SmartSuite up? — the `API US` component on status.smartsuite.com.
 *
 * ## The status page is real
 *
 * SmartSuite publishes at **`status.smartsuite.com`**, an Atlassian
 * Statuspage, and `https://status.smartsuite.com/api/v2/summary.json` answers
 * `200` JSON that self-identifies as:
 *
 *     "page": { "name": "SmartSuite", "url": "https://status.smartsuite.com" }
 *
 * Both are asserted below, so a future redirect or rebrand cannot silently
 * point this probe at someone else's page.
 *
 * ## Why the verdict is one component, not the page roll-up
 *
 * SmartSuite runs **region-scoped clusters**, and the page carries two API
 * components — `API US` (`y7ybh3n19y6w`) and `API EU` (`6ly03chn3njc`) —
 * among seventeen components that also cover file-management infrastructure
 * and the other regional surfaces. `app.smartsuite.com` — the only host this
 * app calls — is the single documented API host with no region selector, so
 * the page-level indicator is the wrong thing to read: it would report this
 * app down for an EU-only incident (or a file-infrastructure one) that cannot
 * affect a single call it makes. The verdict therefore follows the **`API US`**
 * component, and a worse page-level indicator is deliberately *not* allowed to
 * escalate it.
 *
 * ## Severity and posture
 *
 * Left at the `degraded` default for `kind: "service"` — SmartSuite is
 * SaaS-only, so every Connection this app can hold runs on the infrastructure
 * this component describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below: a
 * status host must never see a SmartSuite token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.smartsuite.com/api/v2/summary.json";

/** The page's own host, so a redirect to someone else's page is caught. */
export const STATUS_HOST = "status.smartsuite.com";

/** The component this probe speaks for — `API US` on status.smartsuite.com. */
export const API_COMPONENT_ID = "y7ybh3n19y6w";

/** Exact-name fallback, in case the page re-creates the component under a new id. */
export const API_COMPONENT_NAME = "API US";

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
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

/**
 * Find the component this check speaks for.
 *
 * Id first — it survives a rename — then the exact name, case-insensitively.
 * Deliberately not a substring match: `API EU` must never be mistaken for
 * `API US`.
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
  title: "SmartSuite API status",
  description: "The `API US` component on status.smartsuite.com — the component that speaks for " +
    "app.smartsuite.com, the only API host this app calls. The page's other components " +
    "(including `API EU` and the file-management surfaces) are reported as detail and never " +
    "drive the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about SmartSuite — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.smartsuite\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as SmartSuite's" };
    }
    const pageName = body.page?.name ?? "";
    if (pageName && pageName !== "SmartSuite") {
      return {
        state: "unknown",
        message: `status page no longer self-identifies as SmartSuite (name: ${pageName})`,
      };
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
        message: "status.smartsuite.com no longer publishes an `API US` component",
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

    // The verdict comes from `API US` alone — see the header.
    const state = mapComponentStatus(api.status);

    const notes: string[] = [];
    if (state !== "ok") notes.push(`${api.name}: ${api.status ?? "status not reported"}`);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
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
