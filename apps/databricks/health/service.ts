import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declared `unavailable` rather than guessed — there is no single "is
 * Databricks up" signal: every workspace is a separate deployment on a
 * customer's own cloud account, and Databricks publishes no aggregate,
 * machine-readable status feed covering them. `workspace` (health/workspace.ts)
 * answers the question that actually applies here: is THIS connection's
 * workspace reachable.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Databricks platform status",
  description:
    "Declared absent — Databricks workspaces are per-customer deployments with no aggregate " +
    "status feed. See the `workspace` dependency check for this connection's own reachability.",
  kind: "service",
  scope: "app",
  credential: "none",
  severity: "informational",
  unavailable: {
    reason: "No aggregate status feed exists across Databricks workspaces; each is a separate " +
      "per-customer deployment.",
  },
};

export default service;
