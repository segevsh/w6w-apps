import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Spotify exposes no rate-limit headroom to read. Its rate-limits doc
 * (developer.spotify.com/documentation/web-api/concepts/rate-limits, checked
 * 2026-08-01) states only that a `429` response "will normally include a
 * Retry-After header" — no `X-RateLimit-Remaining`-style counter on any
 * response, documented or otherwise, and no dedicated quota endpoint.
 *
 * Declared rather than omitted, for the same reason as an absent status
 * service: a host should be able to tell "we cannot know" from "nobody
 * looked".
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
    reason:
      "Spotify publishes no rate-limit headroom endpoint or response headers; a 429 carries only Retry-After, with no remaining-quota counter.",
  },
};

export default quota;
