import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * Is Amplitude up — and which half of it?
 *
 * ## The status page makes the same split this app does
 *
 * `status.amplitude.com` is an Atlassian Statuspage, read live 2026-08-18. Its
 * components are grouped by product (Analytics, Data, Experiment, Audiences),
 * and among them are two that matter far more than the rest for this app:
 *
 * - **Data Reception** — the ingest side. When it is down, `event-track` fails
 *   and events are lost or delayed.
 * - **Web Reporting** and **Data Processing** — the query side. When those are
 *   down, ingest keeps working perfectly and every query is wrong or absent.
 *
 * Those fail independently, and the difference matters: a workflow that only
 * sends events is unaffected by a reporting outage, and one that only reads is
 * unaffected by an ingest outage. The check names which half is affected rather
 * than rolling them together.
 *
 * ## Component names repeat across groups
 *
 * "Web Application" appears three times under different products, so keying
 * components by name alone collides and silently drops two of them. The keys
 * here are group-qualified.
 *
 * `scope: "app"` and `informational`: this cannot know whether a given
 * connection sends, reads, or both.
 */
export const STATUS_URL = "https://status.amplitude.com/api/v2/summary.json";

/** The components that decide whether events get in. */
export const INGEST_COMPONENTS = /data reception|event streaming/i;

/** The components that decide whether queries answer. */
export const QUERY_COMPONENTS = /web reporting|data processing|data export/i;

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatuspageSummary {
  page?: { name?: string };
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
}

/** Atlassian's component vocabulary. */
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

/**
 * A stable key for a component.
 *
 * Group-qualified, because "Web Application" appears under three different
 * products and a name-only key would drop two of them.
 */
export function componentKey(
  component: StatuspageComponent,
  groups: Map<string, string>,
  index: number,
): string {
  const slug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const name = component.name;
  if (!name) return component.id ?? `component-${index}`;
  const group = component.group_id ? groups.get(component.group_id) : undefined;
  return group ? `${slug(group)}-${slug(name)}` : slug(name);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Amplitude service status",
  description:
    "Amplitude's status page, which separates INGEST (Data Reception) from QUERY (Web Reporting). " +
    "They fail independently, and which half is affected decides whether a workflow cares.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.amplitude.com"] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    if (!res.ok) {
      await res.body?.cancel();
      // A broken status page says nothing about Amplitude — never `down`.
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.components) {
      return { state: "unknown", message: "the status page did not return its components" };
    }
    if (!/amplitude/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message: "the status page no longer self-identifies as Amplitude's",
      };
    }

    const groups = new Map<string, string>();
    for (const component of body.components) {
      if (component.group === true && component.id && component.name) {
        groups.set(component.id, component.name);
      }
    }

    const components = body.components.filter((c) => c.group !== true && c.name);
    const report: Record<string, HealthComponentReport> = {};
    for (const [index, component] of components.entries()) {
      const state = mapComponentStatus(component.status);
      report[componentKey(component, groups, index)] = state === "ok"
        ? { state }
        : { state, message: component.status };
    }

    const affected = components.filter((c) => mapComponentStatus(c.status) !== "ok");
    if (affected.length === 0) {
      return {
        state: "ok",
        message: body.status?.description ?? "all components operational",
        components: report,
        ttlSeconds: 300,
      };
    }

    // Which half, because a sender and a reader care about different outages.
    const ingestHit = affected.some((c) => INGEST_COMPONENTS.test(c.name ?? ""));
    const queryHit = affected.some((c) => QUERY_COMPONENTS.test(c.name ?? ""));
    const halves = [ingestHit ? "ingest" : "", queryHit ? "query" : ""].filter(Boolean).join(
      " and ",
    );

    const worst = worstHealthState(affected.map((c) => mapComponentStatus(c.status)));
    const names = affected.map((c) => `${c.name} (${c.status})`).join(", ");

    return {
      // Capped: this hook cannot know whether a connection sends, reads or both.
      state: worst === "down" ? "degraded" : worst,
      message: halves
        ? `${halves} affected — ${names}`
        : `${names} — neither the ingest nor the query path`,
      components: report,
      ttlSeconds: 300,
    };
  },
};

export default service;
