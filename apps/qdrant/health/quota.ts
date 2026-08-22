/**
 * A database you run has no quota, and Qdrant does not pretend otherwise.
 *
 * ## Why there is nothing to report
 *
 * Qdrant is an open-source database. A self-hosted instance has no rate limit
 * because there is no vendor to impose one — the limits are the machine's:
 * memory, disk, and how many vectors fit in the HNSW index. Those are capacity
 * questions rather than quota ones, and they are answered by the host's own
 * monitoring rather than by an API.
 *
 * Qdrant Cloud imposes cluster limits by plan, but they are enforced as
 * resource limits on a dedicated cluster rather than as request quotas, and no
 * endpoint reports remaining headroom against them.
 *
 * ## What exists instead, and why it is not this check
 *
 * `GET /metrics` serves Prometheus text, and `GET /telemetry` returns detailed
 * internals — both real, both the right answer to "how is this instance doing",
 * and neither a quota. Parsing a Prometheus exposition format into a health
 * check would be inventing a monitoring system inside a workflow app, badly,
 * when the instance is already exporting to a real one.
 *
 * `GET /quotas` exists in the API and manages *strict-mode* limits an operator
 * sets on themselves — a configuration surface, not a consumption reading.
 *
 * So this states the absence, and the `collections` check answers the
 * operational question a workflow actually has.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Qdrant is a database you run, and a self-hosted instance has no request quota — its " +
      "limits are memory, disk and index size, which are the host's monitoring rather than the " +
      "API's. Verified 2026-08-18 against Qdrant's OpenAPI document (53 paths): no endpoint " +
      "reports remaining request headroom. What exists is `GET /metrics` (Prometheus exposition " +
      "text) and `GET /telemetry` (instance internals) — both the right answer to 'how is this " +
      "instance doing' and neither a quota, and parsing Prometheus text into a health check " +
      "would reinvent a monitoring system the instance already exports to. `GET /quotas` manages " +
      "strict-mode limits an operator sets on themselves: configuration, not consumption. Qdrant " +
      "Cloud's plan limits are enforced as cluster resources rather than request counts.",
  },
};

export default quota;
