import type { HealthCheckDefinition } from "@w6w/types";

/**
 * No standard "headroom before throttling" signal exists across arbitrary
 * Elasticsearch clusters. A cluster has thread pools, circuit breakers and
 * disk watermarks, but those are cluster-health metrics an operator tunes
 * per-deployment, not a quota API in the sense this check kind means (a
 * bounded allowance that resets). Declared rather than omitted, for the same
 * reason as the absent status service: a host should be able to tell "we
 * cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Elasticsearch exposes no standard rate-limit/quota API; each cluster imposes " +
      "whatever thread-pool and circuit-breaker limits its own configuration sets.",
  },
};

export default quota;
