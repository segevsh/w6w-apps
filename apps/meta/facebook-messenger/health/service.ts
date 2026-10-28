import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Meta publishes nothing a machine can read, stated here as a positive fact.
 *
 * `metastatus.com` is a JavaScript shell with no JSON API or feed (measured 2026-10-06), and
 * the developer-site "Meta Status tool" the Messenger docs point at is a human dashboard. The
 * `api` check — an unsigned probe that a Graph auth error proves reachable — and the `quota`
 * check reading `X-App-Usage` are the automatable proxies.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports
 * `unknown`, and at any other severity that would pin every verdict at `unknown` forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Meta platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Meta's status site (metastatus.com) is a JavaScript page with no JSON API or feed, and the developer dashboard is human-only. The `api` check (an unsigned reachability probe) and the `quota` check (X-App-Usage) are the closest automatable proxies.",
  },
};

export default service;
