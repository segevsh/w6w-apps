import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no vendor status feed exists — a positive fact.
 *
 * Checked on 2026-10-06: `status.webscraping.ai` does not resolve, `webscraping.ai/status` answers
 * 404, and neither the OpenAPI document nor the docs page links a status page. WebScraping.AI
 * publishes no machine-readable status, so none is claimed. Whether the API itself is answering is
 * the unsigned `api` check's job.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "WebScraping.AI platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "WebScraping.AI publishes no status page or feed: status.webscraping.ai does not " +
      "resolve and the docs and API spec link none. The `api` check probes the API itself.",
  },
};

export default service;
