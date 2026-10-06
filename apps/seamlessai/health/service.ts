/**
 * Is Seamless.AI up? — declared absent, not faked.
 *
 * Checked 2026-10-06: `status.seamless.ai` answers `403` (a Cloudflare challenge
 * page) to every non-browser client, and `seamless.statuspage.io/api/v2/summary.json`
 * answers `200 text/html` with the same 127,718-byte unclaimed-Statuspage shell the
 * pack has met before — HTTP 200, no `page` object, no feed. The vendor's docs
 * link no status page at all. There is nothing machine-readable to read, so the
 * honest declaration is `unavailable`, at `informational` severity so it never
 * pins the roll-up verdict at `unknown`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Seamless.AI platform status",
  description:
    "No machine-readable status surface: status.seamless.ai is Cloudflare-gated (403) and " +
    "seamless.statuspage.io is the unclaimed Statuspage shell.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Seamless.AI publishes no status page or feed a probe can read " +
      "(status.seamless.ai answers 403; seamless.statuspage.io is an unclaimed 200 HTML shell).",
  },
};

export default service;
