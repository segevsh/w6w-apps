import type { HealthCheckDefinition } from "@w6w/types";

/**
 * SmartSuite publishes no headroom to read, so there is nothing to probe.
 * Declared rather than omitted, for the same reason as an absent status
 * service: a host should be able to tell "we cannot know" from "nobody
 * looked".
 *
 * From <https://developers.smartsuite.com/docs/rate-limits>: *"The API is
 * limited to 5 requests per second per API key… you will receive a 429 status
 * code and will need to wait 30 seconds."* — a **flat** limit, with no
 * headroom endpoint and no rate-limit response header of any kind. `Retry-After`
 * on a rejected call is the only signal, and reading it requires making the call
 * that gets rejected.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "SmartSuite publishes no headroom endpoint and returns no rate-limit headers. It " +
      "enforces a flat 5 requests per second per API key and answers 429 with a 30-second " +
      "cool-off, so `Retry-After` on a rejected call is the only signal — and reading it " +
      "requires making the call that gets rejected.",
  },
};

export default quota;
