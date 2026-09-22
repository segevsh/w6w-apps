/**
 * Is Ecwid up?
 *
 * ## The status page is real, and it was checked three ways on 2026-09-22
 *
 * Ecwid publishes at **`status.ecwid.com`**, an Atlassian Statuspage.
 *
 * **(a) It self-identifies.**
 *
 *     "page": { "id": "nb703gphjy4r", "name": "Ecwid",
 *               "url": "https://status.ecwid.com" }
 *
 * **(b) The body is Statuspage v2 JSON.** `summary.json` answered `200`,
 * `application/json; charset=utf-8`, 2,117 bytes — not the ~127 KB of HTML an
 * unclaimed `*.statuspage.io` host serves, and not a redirect.
 *
 * **(c) It names components of THIS product.** The six top-level components
 * are `Storefront`, `Checkout`, `Admin`, **`API`** (id `7qn5f4cpf4g8`),
 * `Third-party services` and `Billing`.
 *
 * ## The verdict follows the `API` component, not the page indicator
 *
 * That is the whole point of matching a component here. `status: {indicator:
 * "minor"}` is Ecwid's roll-up across the storefront, the checkout, the admin
 * panel, billing and the third parties Ecwid itself depends on — a checkout
 * incident is a real incident for the store, but it is *not* evidence that
 * `app.ecwid.com` is failing, which is the only thing every Connection of this
 * app runs on. So the state comes from the component named **`API`** (matched
 * by its page id first, and by exact name as a fallback, since a page can
 * re-create a component under a new id), and every other component is reported
 * as detail under the same probe.
 *
 * When the page-level indicator is worse than `API`'s own state the message
 * says so, so an operator reading `ok` still learns that something on the
 * storefront is degraded — the state simply is not changed by it.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Ecwid is SaaS-only —
 * there is no self-hosted Ecwid — so every Connection this app can hold runs on
 * the infrastructure that component describes, and its outage is evidence
 * about every tenant. `credential: "none"` is the default for `kind:
 * "service"` and is stated explicitly because it is the precondition for the
 * `network` widening below: a status host must never see an Ecwid token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.ecwid.com/api/v2/summary.json";

/** The component this probe speaks for: "API", verified 2026-09-22. */
export const API_COMPONENT_ID = "7qn5f4cpf4g8";

/** Name fallback, in case the page re-creates the component under a new id. */
export const API_COMPONENT_NAME = "API";

/** The page's own identity, so a redirect to someone else's page is caught. */
export const STATUS_HOST = "status.ecwid.com";

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
 * Deliberately not a substring match: `Third-party services` must never be
 * mistaken for `API`.
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
  title: "Ecwid platform status",
  description:
    "The `API` component on status.ecwid.com — the component that speaks for app.ecwid.com. " +
    "Storefront, Checkout, Admin, Billing and Third-party services are reported as detail but " +
    "never drive the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Ecwid — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.ecwid\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Ecwid's" };
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
        message: "status.ecwid.com no longer publishes an `API` component",
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

    const state = mapComponentStatus(api.status);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");

    const notes: string[] = [];
    if (state !== "ok") notes.push(`API: ${api.status}`);
    // The page roll-up is not the verdict — but it is worth naming, so an `ok`
    // verdict does not hide a storefront incident from whoever reads the report.
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
