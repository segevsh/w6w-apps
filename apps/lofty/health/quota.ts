import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Lofty exposes no headroom this app can read, so there is nothing to probe.
 * Declared rather than omitted, for the same reason as an absent status
 * service: a host should be able to tell "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 *
 * Verified 2026-09-22 against the Lofty Open API reference embedded in
 * <https://api.lofty.com/docs/>: none of the operations this app implements
 * documents a rate-limit header (`X-RateLimit-*`, `RateLimit-*`, `Retry-After`)
 * or an endpoint reporting remaining allowance, and the generic failure shape
 * is a bare message string with no quota detail. Whether Lofty throttles at all
 * is not published, so headroom has to be budgeted from observed failures.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Lofty's Open API reference documents no rate-limit response headers and no endpoint " +
      "reporting remaining allowance, so headroom cannot be read — only budgeted from observed " +
      "failures.",
  },
};

export default quota;
