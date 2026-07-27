import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The WooCommerce REST API exposes no rate-limit headroom to read — its
 * responses carry no `X-RateLimit-*` / `RateLimit-*` headers, and any throttling
 * is whatever the tenant's own host imposes. There is nothing to probe.
 * Declared rather than omitted, for the same reason as an absent status
 * service: a host should be able to tell "we cannot know" from "nobody looked".
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
    reason:
      "The WooCommerce REST API returns no rate-limit headers; any throttling is whatever the store's own host imposes, and is not machine-readable.",
  },
};

export default quota;
