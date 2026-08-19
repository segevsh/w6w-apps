import type { HealthCheckDefinition } from "@w6w/types";

const SUMMARY = "https://status.airbyte.com/api/v2/summary.json";

const RANK: Record<string, number> = {
  operational: 0,
  under_maintenance: 1,
  degraded_performance: 2,
  partial_outage: 3,
  major_outage: 4,
};

/**
 * Airbyte Cloud's status page — reported, and deliberately not fatal.
 *
 * ## It speaks for Cloud, and Airbyte is open source
 *
 * A great many Airbyte deployments are self-managed, and for those this feed
 * says nothing at all. Marking every self-hosted connection unhealthy because
 * Airbyte Cloud has an incident would be worse than useless, so this is
 * informational and `health/api.ts` — which probes the connection's own host —
 * is the check that decides.
 *
 * ## Airbyte failing is not the same as data being stale
 *
 * The distinctive thing about this app: a pipeline that has stopped moving
 * data usually has nothing to do with Airbyte's health. It is a paused
 * connection, a source whose credentials expired, or a schema change the
 * connector could not handle — all of which leave Airbyte perfectly
 * operational and the warehouse quietly out of date.
 *
 * So a green status page here is genuinely weak evidence about the thing
 * anybody cares about. `job-list` and `connection-list` are where that
 * question is answered.
 */
const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "Airbyte Cloud status",
  description:
    "Airbyte Cloud's status feed — INFORMATIONAL, because much of Airbyte is self-managed and " +
    "this says nothing about those. It is also weak evidence generally: a stale pipeline is " +
    "usually a paused connection or an expired source credential, not Airbyte being down.",
  covers: ["service"],
  severity: "informational",
  minIntervalSeconds: 300,
  network: { allow: ["status.airbyte.com"] },

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(SUMMARY, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return { state: "unknown", message: `the status page answered ${res.status}`, latencyMs };
    }

    interface Summary {
      status?: { description?: string };
      components?: Array<{ name?: string; status?: string }>;
      incidents?: Array<{ name?: string }>;
    }
    let summary: Summary;
    try {
      summary = await res.json() as Summary;
    } catch {
      return { state: "unknown", message: "the status page did not return JSON", latencyMs };
    }

    const components = summary.components ?? [];
    if (!components.length) {
      return { state: "unknown", message: "the status page listed no components", latencyMs };
    }

    const unhappy = components
      .filter((component) => (RANK[String(component?.status)] ?? 0) > 0)
      .map((component) => `${component?.name} is ${component?.status}`);
    const incident = (summary.incidents ?? [])[0]?.name;

    if (!unhappy.length) {
      return {
        state: "ok",
        message: `${summary.status?.description ?? "all components operational"} — for Airbyte ` +
          "Cloud, which says nothing about a self-managed deployment",
        latencyMs,
      };
    }

    return {
      state: "degraded",
      message: `${unhappy.join(", ")}${incident ? ` (${incident})` : ""}. This covers Airbyte ` +
        "Cloud only, and a stale pipeline is more often a paused connection than an outage",
      latencyMs,
    };
  },
};

export default check;
