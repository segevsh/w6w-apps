import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Anchor publishes no usable status page. `anchor.statuspage.io` exists and
 * answers Atlassian-schema JSON, but it is Statuspage's untouched starter
 * page (checked 2026-10-06): its components are literally named `API (example)`
 * and `Management Portal (example)`, `updated_at` is the day it was created
 * (2026-01-23), and Anchor's own help centre and API docs link to no status
 * page. Pointing a check at it would report `ok` forever, whatever Anchor
 * does — the exact failure the pack's status-page guidance warns about.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Anchor platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Anchor publishes no status page for its API. The only candidate, " +
      "anchor.statuspage.io, is an unconfigured Statuspage starter whose components are named " +
      "'API (example)' and 'Management Portal (example)', and it is linked from nowhere in " +
      "Anchor's help centre or developer docs, so it says nothing about the real service. " +
      "Credential liveness (auth:api-key) and rate-limit headroom (quota) are reported instead.",
  },
};

export default service;
