import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is ClickHouse Cloud up?
 *
 * `status.clickhouse.com` is a Statuspage and `summary.json` is the right
 * route — verified 2026-08-19, it returns the page and its components in one
 * document.
 *
 * ## The control plane and the services are different components
 *
 * An outage of the **API** stops services being created, scaled or stopped, and
 * stops nothing that is already running from answering queries. An outage of
 * the **services** is the other way round. A workflow that only queries and a
 * workflow that only provisions are affected by different halves of this board,
 * so the check reports which.
 *
 * ## And it is regional, which this cannot see
 *
 * A service lives in one cloud region. A ClickHouse Cloud incident is usually
 * scoped to a region or a provider, and this check is app-scoped: it does not
 * know which region a given connection's service is in. So it never claims
 * `down` for the whole platform, and the connection-scoped checks are what
 * speak for a particular service.
 */
export const STATUS_URL = "https://status.clickhouse.com/api/v2/summary.json";

/** The control plane — creating, scaling and stopping services. */
export const API_COMPONENT = /api|control plane|console/i;

/** The services themselves — where queries go. */
export const SERVICE_COMPONENT = /service|database|cloud/i;

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface Summary {
  page?: { name?: string };
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
}

/** Statuspage's vocabulary, mapped onto the health states. */
export function mapComponentStatus(status: string | undefined): "ok" | "degraded" | "down" {
  switch (status) {
    case "operational":
      return "ok";
    case "major_outage":
      return "down";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    default:
      return "degraded";
  }
}

const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "ClickHouse Cloud status",
  description:
    "Reads status.clickhouse.com, separating the CONTROL PLANE from the services: an API outage " +
    "stops provisioning and not queries, and a service outage is the other way round. Never " +
    "claims a full outage, because incidents are regional and this is app-scoped.",
  covers: ["service"],
  severity: "informational",
  minIntervalSeconds: 120,
  network: { allow: ["status.clickhouse.com"] },

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "unknown",
        message: `could not reach the ClickHouse status page: ${String(err)}`,
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `the ClickHouse status page answered ${res.status}` };
    }

    let body: Summary | null = null;
    try {
      body = await res.json() as Summary;
    } catch {
      return { state: "unknown", message: "the ClickHouse status page did not return JSON" };
    }

    const components = body?.components ?? [];
    if (!components.length) {
      return { state: "unknown", message: "the ClickHouse status page listed no components" };
    }

    const affected = components.filter((component) =>
      mapComponentStatus(component?.status) !== "ok"
    );
    if (!affected.length) {
      return {
        state: "ok",
        message: body?.status?.description ?? "all ClickHouse Cloud components are operational",
      };
    }

    const apiAffected = affected.filter((component) => API_COMPONENT.test(component?.name ?? ""));
    const serviceAffected = affected.filter((component) =>
      SERVICE_COMPONENT.test(component?.name ?? "")
    );

    const componentStates: Record<string, { state: "ok" | "degraded" | "down"; message?: string }> =
      {};
    for (const component of affected) {
      const key = String(component?.name ?? "component").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      componentStates[key] = {
        state: mapComponentStatus(component?.status),
        message: component?.status,
      };
    }

    const parts: string[] = [];
    if (apiAffected.length) {
      parts.push(
        "the control plane is affected — provisioning and scaling will fail, running " +
          "services will not",
      );
    }
    if (serviceAffected.length) parts.push("services are affected — queries may fail");
    if (!parts.length) {
      parts.push(
        `${affected.length} component(s) affected: ${
          affected.map((component) => component?.name).filter(Boolean).join(", ")
        }`,
      );
    }

    return {
      // Incidents here are regional and this check is app-scoped, so it never
      // claims the whole platform is down.
      state: "degraded",
      message: parts.join("; "),
      components: componentStates,
    };
  },
};

export default check;
