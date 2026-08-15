/**
 * Is Thinkific up?
 *
 * ## The status page is real. Checked on 2026-08-15
 *
 * Thinkific publishes at **`status.thinkific.com`**, an Atlassian Statuspage.
 *
 * **(a) Content-type AND body.** `GET /api/v2/summary.json` answers
 * `application/json`, 7,321 bytes, parsing as the Statuspage v2 schema — not
 * the ~127,700 B HTML an unclaimed `*.statuspage.io` serves.
 *
 * **(b) Does the page describe THIS product?** Yes:
 *
 *     "page": {"id": "w1vms1jfy8ry", "name": "Thinkific",
 *              "url": "https://status.thinkific.com"}
 *
 * and its 20 components are Thinkific's own plus its infrastructure
 * dependencies: `Thinkific Application`, `Thinkific.com`, `Thinkific Help
 * Center`, `Thinkific Webhooks`, `Thinkific Partner Portal`, and a set of
 * upstream services (AWS eks/elasticache/elasticsearch/lambda/rds/route53/sqs,
 * Stripe API, Stripe Dashboard, Mailgun, Filestack, Fastly, Wistia).
 *
 * ## No dedicated "API" component
 *
 * Unlike a lot of vendors in this pack, Thinkific's status page names no
 * component called "API". The Admin API this app calls is served from the
 * same platform `Thinkific Application` covers (there is no separate api.*
 * infrastructure entry on the page), so that component is the one this check
 * treats as the App's own health; the rest — `Thinkific.com` (the marketing
 * site), `Thinkific Help Center`, `Thinkific Partner Portal`, and the AWS /
 * Stripe / Mailgun / Filestack / Fastly / Wistia dependencies — are reported
 * too (this app has no business hiding a real incident), but are not what a
 * failing Admin API call would be blamed on.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Thinkific is SaaS-only
 * — there is no self-hosted Thinkific — so an incident here is evidence about
 * every Connection this app can hold.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see an API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.thinkific.com/api/v2/summary.json";

/** The component whose failure this check treats as "the Admin API is down". */
export const PRIMARY_COMPONENT_NAME = "Thinkific Application";

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
  title: "Thinkific platform status",
  description:
    "Component status from status.thinkific.com: the Thinkific Application (which serves the " +
    "Admin API), the marketing site, Help Center, Partner Portal, Webhooks, plus the AWS, " +
    "Stripe, Mailgun, Filestack, Fastly and Wistia services Thinkific itself depends on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.thinkific.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Thinkific — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.thinkific\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Thinkific's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const primary = nodes.find((n) => n.name === PRIMARY_COMPONENT_NAME);
    const indicator = body.status?.indicator;
    // Prefer the primary component's own status when it is degraded — the
    // page-level indicator can undersell an incident scoped to just one
    // component if Statuspage has not yet rolled the indicator up.
    const primaryState = primary ? mapComponentStatus(primary.status) : undefined;
    const rollUpState = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);
    const state = primaryState && primaryState !== "ok"
      ? worstHealthState([primaryState, rollUpState])
      : rollUpState;

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
