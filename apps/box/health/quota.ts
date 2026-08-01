import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Box exposes no rate-limit headroom to read. On a 429 it returns only a
 * `retry-after` header (https://developer.box.com/guides/api-calls/permissions-and-errors/rate-limits/) —
 * no `X-RateLimit-Remaining`-style counter, and no dedicated endpoint. (Box's
 * `/users/me` does report *storage* quota via `space_amount`/`space_used`,
 * but that answers a different question — "how much room is left in the
 * account" — from this check's kind: "is there headroom left before
 * throttling". Declared absent rather than repurposed.)
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
      "Box publishes no rate-limit headroom endpoint or response headers; a 429 carries only Retry-After, with no remaining-quota counter.",
  },
};

export default quota;
