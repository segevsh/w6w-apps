import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is 1Password up?
 *
 * ## The page is region-partitioned, and only half of it applies
 *
 * `status.1password.com` is an Atlassian Statuspage, read live 2026-08-18: **88
 * components**, grouped by region — `USA/Global`, `Canada`, `Europe` — with the
 * same component names repeating inside each group. So keys have to be
 * group-qualified, or the same name in three regions collapses to one entry and
 * two are silently dropped.
 *
 * ## For a Connect connection this page is nearly irrelevant
 *
 * That is the part worth stating. A Connect server holds a local copy of its
 * vaults and keeps serving them **while 1Password's own services are down** —
 * that is much of the point of running one. So an outage here does not
 * necessarily mean a Connect-backed workflow fails; it means the server stops
 * receiving *updates*, and will serve slightly stale secrets until it can sync
 * again.
 *
 * For an Events connection the page matters directly: the Events API is
 * 1Password's own service and goes down with it.
 *
 * The check therefore stays `informational` and capped at `degraded`. It is
 * `scope: "app"` and cannot know which kind of connection is asking — the
 * `surface` check is the one that speaks for a particular connection.
 */
export const STATUS_URL = "https://status.1password.com/api/v2/summary.json";

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
 * Group-qualified, because the same names repeat inside every region group and
 * a name-only key would keep one of three.
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
  title: "1Password service status",
  description:
    "1Password's own status, by region. A Connect server keeps serving its vaults through an " +
    "outage — it stops receiving updates rather than stopping — so this matters far more to an " +
    "Events connection than a Connect one.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.1password.com"] },
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
      // A broken status page says nothing about 1Password — never `down`.
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.components) {
      return { state: "unknown", message: "the status page did not return its components" };
    }
    if (!/1password/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message: "the status page no longer self-identifies as 1Password's",
      };
    }

    const groups = new Map<string, string>();
    for (const component of body.components) {
      if (component.group === true && component.id && component.name) {
        groups.set(component.id, component.name);
      }
    }

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

    // Only the affected ones — 88 entries is not a report.
    const report: Record<string, HealthComponentReport> = {};
    const regions = new Set<string>();
    for (const [index, component] of affected.entries()) {
      report[componentKey(component, groups, index)] = {
        state: mapComponentStatus(component.status),
        message: component.status,
      };
      const region = component.group_id ? groups.get(component.group_id) : undefined;
      if (region) regions.add(region);
    }

    const regionList = [...regions].sort().join(", ");
    return {
      // Capped: a Connect connection may be entirely unaffected.
      state: "degraded",
      message: `${affected.length} components affected${regionList ? ` in ${regionList}` : ""} — ` +
        "a Connect server keeps serving its vaults through this and stops receiving updates",
      components: report,
      ttlSeconds: 300,
    };
  },
};

export default service;
