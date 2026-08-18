import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is New Relic up — and in which region?
 *
 * ## The status page is partitioned by data centre, which most are not
 *
 * `status.newrelic.com` is an Atlassian Statuspage. Read live on 2026-08-18 it
 * carries **115 components**, and the naming is the useful part: every one is
 * suffixed with its region — `APM : US`, `APM : Europe`, `APM : JP`,
 * `Alerts : US`, and so on, under groups called `Data Ingest : US`,
 * `UI : Europe` and the like.
 *
 * That matters because a New Relic account lives in exactly one region, and an
 * incident in another is not an incident for that account. A status check that
 * rolled all 115 together would report every EU outage to every US customer,
 * which is noise that trains people to ignore it.
 *
 * So this splits them: components are reported with their region, and the
 * message names which region is affected. It is `scope: "app"`, so it cannot
 * know which region a given connection uses — the state is therefore capped at
 * `degraded` and marked `informational`, and the region names in the message
 * are what let somebody tell in a second whether it is theirs.
 */
export const STATUS_URL = "https://status.newrelic.com/api/v2/summary.json";

/** `APM : Europe` → `Europe`. Everything on this page carries one. */
export function regionOf(name: string): string | undefined {
  const match = /\s:\s*([A-Za-z]+)\s*$/.exec(name);
  return match?.[1];
}

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
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

/** Slugify a component name into a stable key. */
export function componentKey(component: StatuspageComponent, index: number): string {
  const name = component.name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return component.id ?? `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "New Relic service status",
  description:
    "New Relic's status page, which is partitioned by data centre. An incident in another " +
    "region is not an incident for an account in this one, so the affected regions are named.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.newrelic.com"] },
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
      // A broken status page says nothing about New Relic — never `down`.
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.components) {
      return { state: "unknown", message: "the status page did not return its components" };
    }
    if (!/new relic/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message: "the status page no longer self-identifies as New Relic's",
      };
    }

    // Groups are headings, not services.
    const components = body.components.filter((c) => c.group !== true && c.name);
    const affected = components.filter((c) => mapComponentStatus(c.status) !== "ok");

    if (affected.length === 0) {
      return {
        state: "ok",
        message: `${body.status?.description ?? "all operational"} across ${components.length} ` +
          "components",
        ttlSeconds: 300,
      };
    }

    // Only the affected ones become components — 115 entries is not a report.
    const report: Record<string, HealthComponentReport> = {};
    const regions = new Set<string>();
    for (const [index, component] of affected.entries()) {
      report[componentKey(component, index)] = {
        state: mapComponentStatus(component.status),
        message: component.status,
      };
      const region = regionOf(component.name ?? "");
      if (region) regions.add(region);
    }

    const regionList = [...regions].sort().join(", ");
    return {
      // Capped: an app-scoped check cannot know which region this connection
      // reads, and most incidents are one region's.
      state: "degraded",
      message: `${affected.length} components affected${
        regionList ? ` in ${regionList}` : ""
      } — an incident in another region does not affect an account in this one`,
      components: report,
      ttlSeconds: 300,
    };
  },
};

export default service;
