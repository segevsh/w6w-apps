/**
 * Is Productboard up?
 *
 * ## The status page is real. It was checked three ways on 2026-08-11
 *
 * Productboard publishes at **`status.productboard.com`**, an Atlassian
 * Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes | md5 (first 12) |
 *   | -------------------------------------- | ------- | ----- | -------------- |
 *   | `/api/v2/summary.json`                 | 200     | 6,225 | `40b773b00529` |
 *   | `/api/v2/status.json`                  | 200     | 224   | `42043acefa7c` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —              |
 *
 * Three different answers, and the nonsense path is refused outright.
 *
 * **(b) Content-type AND body.** `application/json; charset=utf-8`, parsing as
 * the Statuspage v2 schema. Neither known unclaimed-host signature matches: an
 * unclaimed `*.statuspage.io` is ~127,700 B of HTML, an unclaimed
 * `*.instatus.com` is ~216,800 B. This is 6,225 B of JSON.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "wwwnvh1nlpt1", "name": "Productboard",
 *               "url": "https://status.productboard.com" }
 *
 * ## Does a component actually cover the API? Yes — and it is the only one
 *
 * The page carries 17 components, one of which is a group container. The
 * five first-party components are `Spark AI`, `Web Application`,
 * **`MCP, APIs and Integrations`**, `Identity & Access` and
 * `Website (www.productboard.com)`.
 *
 * `MCP, APIs and Integrations` is the component this App's egress depends on,
 * and it is reported as `component:x5zhztnyv1dd` so a host can attribute a
 * failure to the API rather than greying out the App because the marketing site
 * is down. `Identity & Access` matters too — it is what a `401` looks like from
 * the vendor's side.
 *
 * **Eleven of the seventeen are not Productboard.** The `External services`
 * group (`dgn4hsdlwzcs`) carries Anthropic's Claude API, Stripe, Cloudflare
 * Workers, AWS RDS, AWS EC2, both Pusher Channels APIs, Slack, both Intercom
 * APIs and SendGrid. They are genuinely upstream of Productboard, so they are
 * reported — but keyed by the vendor's own component id, so `SendGrid API` can
 * never be mistaken for a Productboard service by someone skimming names.
 *
 * ## The page-level indicator is the verdict, components are the detail
 *
 * `status.indicator` is Productboard's own roll-up across all seventeen, and it
 * is the field to trust. Deriving a verdict from the component list instead
 * would report Productboard down because Stripe is having a bad day.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Productboard is
 * SaaS-only — there is no self-hosted Productboard and no regional host; all
 * nine v2 OpenAPI documents declare the single server
 * `https://api.productboard.com/v2` — so every Connection this App can hold
 * runs on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Productboard access token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.productboard.com/api/v2/summary.json";

/** The component that covers this App's egress, measured 2026-08-11. */
export const API_COMPONENT_ID = "x5zhztnyv1dd";

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
 * Key a component by the vendor's id, falling back to a slug of the name.
 *
 * The id is stable across renames and is what the page's own incident records
 * reference. The fallback exists only so a future page that drops ids still
 * reports something rather than silently dropping rows.
 */
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
  title: "Productboard platform status",
  description:
    "Component status from status.productboard.com. Covers Spark AI, the Web Application, " +
    "MCP/APIs/Integrations (the component this app's requests depend on), Identity & Access and " +
    "the website, plus the eleven external services (Anthropic, Stripe, Cloudflare, AWS, Pusher, " +
    "Slack, Intercom, SendGrid) Productboard itself depends on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*", `component:${API_COMPONENT_ID}`],
  network: { allow: ["status.productboard.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Productboard — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.productboard\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Productboard's",
      };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; reporting them would double-count every external service.
    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
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
