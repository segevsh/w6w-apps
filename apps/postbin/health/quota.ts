import type { HealthCheckDefinition } from "@w6w/types";

/**
 * PostBin's public API docs (postb.in/api) document no rate limit, quota, or
 * usage headroom mechanism of any kind — not even a numeric threshold like
 * some vendors publish without a matching endpoint. Declared absent rather
 * than omitted, so a host can tell "we looked and there is nothing" from
 * "nobody looked". `severity: "informational"` because a declared absence
 * always reports `unknown`, and this must never pin the App's rolled-up
 * verdict there.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "PostBin's API docs document no rate limit, quota, or usage headroom mechanism.",
  },
};

export default quota;
