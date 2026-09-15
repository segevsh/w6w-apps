/**
 * Is Shortcut up?
 *
 * ## The status page is real, checked three ways on 2026-09-15
 *
 * Shortcut publishes at **`status.shortcut.com`**, an Atlassian Statuspage.
 * (`status.clubhouse.io`, the pre-rename hostname, still resolves and redirects
 * straight to `status.shortcut.com` — see the app README.)
 *
 * **(a) Bogus sibling path — is this a catch-all?** No: `/api/v2/summary.json`
 * answers `200` with 7,848 bytes of JSON; `/api/v2/definitely-not-real-zzz.json`
 * answers **404** with an empty body.
 *
 * **(b) Content-type and body.** `application/json; charset=utf-8`, parsing as
 * the Statuspage v2 schema — far short of the ~127,700 B of HTML an unclaimed
 * `*.statuspage.io` page serves.
 *
 * **(c) Does the page describe THIS product?** Yes:
 * `"page": {"id": "27fcn0qntr9w", "name": "Shortcut", "url":
 * "https://status.shortcut.com"}`, and its 23 components include `API`,
 * `Web App`, `Shortcut MCP`, `Shortcut Docs`, `Search`, `VCS Integrations`,
 * `Slack Integration` and `Google Sheets Integration` — Shortcut's own surface.
 *
 * ## Two findings that shape the code below
 *
 * **Several components are not Shortcut itself.** `AWS ec2-us-east-1`,
 * `GitHub Webhooks`/`GitHub API Requests`, `Atlassian Bitbucket Webhooks`/`API`,
 * `Slack Apps/Integrations/APIs`, `Zendesk`, `Fastly Edge Cloud Platform` and
 * `ProductBoard` are upstream dependencies, genuinely reported, but keyed by the
 * vendor's own component id so `Zendesk` is never mistaken for a Shortcut outage
 * by a reader skimming component names.
 *
 * **The page-level indicator is the verdict, components are the detail** — same
 * reasoning as every other status-page check in this pack: `status.indicator` is
 * Shortcut's own roll-up, and deriving a verdict from the component list instead
 * would report Shortcut down because Zendesk is having a bad day.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Shortcut is SaaS-only —
 * there is no self-hosted Shortcut — so every Connection this app can hold runs
 * on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is explicit because it is the precondition for the
 * `network` widening below — a status host must never see a Shortcut API token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.shortcut.com/api/v2/summary.json";

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
 * The id is stable across renames; the fallback exists only so a future page
 * that drops ids still reports something rather than silently dropping rows.
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
  title: "Shortcut platform status",
  description:
    "Component status from status.shortcut.com. Covers the API, Web App, Search, Shortcut MCP " +
    "and Shortcut Docs, plus the upstream integrations (GitHub, Atlassian Bitbucket, Slack, " +
    "Zendesk, AWS, Fastly, ProductBoard) Shortcut itself depends on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.shortcut.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Shortcut — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently pointing this probe at someone
    // else's page — the failure mode where a healthy, claimed status page
    // belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.shortcut\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Shortcut's" };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; reporting them would double-count the grouped components.
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
