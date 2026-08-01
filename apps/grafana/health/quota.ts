import type { HealthCheckDefinition } from "@w6w/types";

/**
 * No standard "headroom before throttling" signal exists across arbitrary
 * Grafana instances. Grafana Enterprise/Cloud has org-level resource quotas
 * (dashboards, data sources, users, …) surfaced under admin-only endpoints,
 * but that's an Enterprise/Cloud feature gated behind org-admin privilege,
 * not a universal rate-limit API every instance exposes — and this app has
 * no way to know whether a given Connection's instance even has quotas
 * configured. Declared rather than omitted, for the same reason as the
 * absent status service: a host should be able to tell "we cannot know"
 * from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`,
 * and an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Grafana exposes no standard rate-limit/quota API for arbitrary instances. " +
      "Org-level resource quotas exist as an Enterprise/Cloud admin feature, gated behind " +
      "org-admin privilege, not a universal signal every self-hosted instance provides.",
  },
};

export default quota;
