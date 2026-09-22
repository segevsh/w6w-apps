/**
 * Is Practice Better up?
 *
 * ## The status page is real, and it was checked 2026-09-22
 *
 * Practice Better publishes at **`status.practicebetter.io`** — an Atlassian
 * Statuspage whose `page` block self-identifies as
 *
 *     "page": { "id": "lb02qlh5617c", "name": "Practice Better",
 *               "url": "https://status.practicebetter.io" }
 *
 * The same page is reachable at `practicebetter.statuspage.io` with the same
 * page id, which is the usual Statuspage pairing and not a second, decoy page.
 *
 * ## The verdict follows the `Practice Better API` component
 *
 * That is the whole point of pinning a component here. The page reports `Web
 * Portal`, `Telehealth/Video Chat`, `Faxing`, `Email Delivery`, `Text/SMS
 * Delivery`, `Help Desk`, `Community` and an `Integrations` group (Claim.MD,
 * Cronometer, DrFirst, Evexia, Fitbit, Fullscript, Garmin, Google Calendar,
 * Natural Dispensary, Nutritionix, Oura, Rupa Health, Square, Stripe, That Clean
 * Life, WholeScripts, Zapier, Zoom) — all real Practice Better components, but a
 * telehealth incident or a Stripe outage is *not* evidence that
 * `api.practicebetter.io` is failing, which is the only thing every Connection
 * of this app runs on. So the state comes from the component literally named
 * **`Practice Better API`** (id `hg7zsrq27t7g`, matched by id first and by exact
 * name as a fallback, since a page can re-create a component under a new id),
 * and every other component is reported as detail under the same probe.
 *
 * When the page-level indicator is worse than the API component's own state the
 * message says so, so an operator reading `ok` still learns that something else
 * on the page is degraded — the state simply is not changed by it. The
 * `Integrations` group in particular can be degraded by a partner's outage
 * without the API itself being affected, and the `Integrations` group is
 * explicitly **not** the app's health.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Practice Better is
 * SaaS-only — there is no self-hosted Practice Better — so every Connection this
 * app can hold runs on exactly the infrastructure that component describes.
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below: a
 * status host must never see a Practice Better token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.practicebetter.io/api/v2/summary.json";

/** The component this probe speaks for, verified 2026-09-22. */
export const API_COMPONENT_ID = "hg7zsrq27t7g";

/** Name fallback, in case the page re-creates the component under a new id. */
export const API_COMPONENT_NAME = "Practice Better API";

/** The page's own identity, so a redirect to someone else's page is caught. */
export const STATUS_HOST = "status.practicebetter.io";

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
 * Deliberately not a substring match: `Integrations` and `Web Portal` must never
 * be mistaken for `Practice Better API`.
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
  title: "Practice Better platform status",
  description:
    "The `Practice Better API` component on status.practicebetter.io (id hg7zsrq27t7g) — the " +
    "component that speaks for api.practicebetter.io. Web Portal, Telehealth, Faxing, Email/SMS " +
    "delivery, Help Desk, Community and the Integrations group are reported as detail but never " +
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
      // A broken status API says nothing about Practice Better — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page. Both documented hostnames are accepted.
    const pageUrl = body.page?.url ?? "";
    if (
      pageUrl && !/(^|\/\/|\.)(status\.practicebetter\.io|practicebetter\.statuspage\.io)(\/|$)/i
        .test(pageUrl)
    ) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Practice Better's",
      };
    }

    // `group: true` rows are containers whose status only mirrors their
    // children; reporting them would double-count.
    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const api = findApiComponent(nodes);
    if (!api) {
      return {
        state: "unknown",
        message: "status.practicebetter.io no longer publishes a `Practice Better API` component",
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
    if (state !== "ok") notes.push(`${API_COMPONENT_NAME}: ${api.status}`);
    // The page roll-up is not the verdict — but it is worth naming, so an `ok`
    // verdict does not hide a portal or integration incident from a reader.
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
