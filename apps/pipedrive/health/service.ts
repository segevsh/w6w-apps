import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Pipedrive up? — declared absent, honestly.
 *
 * status.pipedrive.com is NOT an Atlassian Statuspage (which would give us
 * `GET /api/v2/status.json`); it is hosted by Sorry™ (sorryapp.com). That
 * platform exposes no machine-readable surface we could verify: `/api/v2/*`,
 * `/rss`, `/feed`, `/history.rss`, `/notices.rss` and the page-level JSON all
 * return 404, and the public page ships no `<link rel="alternate">` feed and no
 * embedded page id to reach the Sorry™ API (which is key-gated anyway). Verified
 * 2026-07-27.
 *
 * Declaring the absence is a positive fact, not an omission — a host can render
 * "not knowable" instead of leaving an operator to conclude the publisher forgot
 * to wire a probe.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity a declared absence would pin every verdict for this app at
 * `unknown` forever. Informational checks never worsen a verdict; they are
 * carried for display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Pipedrive platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.pipedrive.com is a Sorry™ (sorryapp.com) status page with no verifiable machine-readable surface — no Statuspage `/api/v2/status.json`, no RSS/Atom feed, no page-level JSON (all 404 as of 2026-07-27). The derived `auth:*` credential check is the only automatable liveness signal.",
  },
};

export default service;
