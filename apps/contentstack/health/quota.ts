/**
 * Quota — declared absent.
 *
 * Contentstack documents a CMA rate limit of 10 requests per second per
 * organization (1 per second for bulk actions) and returns `X-RateLimit-Limit`
 * / `X-RateLimit-Remaining` headers on responses, answering `429` once it is
 * exceeded. That window resets every second and is shared across the whole
 * organization, so a reading taken by a periodic probe says nothing about the
 * headroom a workflow will see a moment later — it is not a leading indicator.
 * There is no plan-usage endpoint on the CMA. Declared absence with
 * `informational` severity so it cannot pin the verdict at `unknown`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "Contentstack's CMA limit is a 10 requests/second organization-wide window " +
      "(X-RateLimit-* headers), which resets every second and is not a meaningful headroom " +
      "reading for a periodic probe; no plan-usage endpoint exists on the CMA.",
  },
};

export default quota;
