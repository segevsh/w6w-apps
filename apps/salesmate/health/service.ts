import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Salesmate publishes no machine-readable status. `status.salesmate.io`
 * answers 200 but is not a status page: it is Salesmate's own web-app shell
 * (title "Salesmate", `server: istio-envoy`), its `/api/...` paths are proxied
 * to the Salesmate API (`/api/v2/summary.json` returns the API's own
 * `{"Status":"failure","Error":{"Name":"ObjectNotFound"...}}` envelope), and
 * `/index.json`, `/history.atom`, `/history.rss` and `/feed.rss` all 404.
 * `salesmate.statuspage.io` answers 401 "Your page is inactive". Declared
 * absent rather than pointed at a page that says nothing about the API.
 *
 * `severity: "informational"` because a declared absence always reports
 * `unknown`, which would otherwise pin the roll-up there forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Salesmate platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Salesmate publishes no machine-readable status: status.salesmate.io is the product's own " +
      "web-app shell (not a status page, and /api/* there proxies to the Salesmate API), has no " +
      "JSON or feed, and salesmate.statuspage.io is inactive. The `domain` dependency check " +
      "probes this connection's own account host instead.",
  },
};

export default service;
