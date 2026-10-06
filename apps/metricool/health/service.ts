import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Metricool publishes no status page or feed, declared as a positive fact.
 *
 * Checked on 2026-10-06: `status.metricool.com` does not resolve; `metricool.statuspage.io`
 * answers "Your page is inactive" (an unclaimed Statuspage, not Metricool's);
 * `metricool.betteruptime.com/index.json` redirects to Better Stack's marketing page; the
 * Instatus guess is a 404; `metricool.com/status/` is a 404. The `api` check covers "is the API
 * serving" instead.
 *
 * `severity: "informational"`: without it the permanent `unknown` pins the App's verdict.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Metricool platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Metricool publishes no status page or feed: status.metricool.com does not resolve, " +
      "metricool.statuspage.io is an inactive page, and no Instatus or Better Stack page exists.",
  },
};

export default service;
