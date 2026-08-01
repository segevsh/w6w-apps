/**
 * No `quota` check — declared, not omitted.
 *
 * CircleCI's API v2 reference documents `429` ("API rate limits exceeded")
 * as a possible response on many endpoints, but publishes no response
 * headers (no `X-RateLimit-*`, no `RateLimit-*`) that would let an App read
 * remaining headroom before hitting that 429. Unlike Netlify
 * (`X-RateLimit-*`) or Eventbrite (`X-Rate-Limit-*`), there is nothing here
 * to parse — inventing a probe would report a number CircleCI itself does
 * not expose.
 *
 * `severity: "informational"` is load-bearing here, same as Grafana's
 * `unavailable` service check: an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 * Informational checks never worsen a verdict; they are carried for display.
 *
 * Verified 2026-08-01 against https://circleci.com/docs/api/v2/ (no
 * "Rate-Limiting" section documents response headers, only the 429 status).
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "CircleCI's API v2 docs document a 429 response for rate limiting but publish no " +
      "response headers (no X-RateLimit-* or similar) that expose remaining headroom, so " +
      "there is nothing for this app to read ahead of a 429.",
  },
};

export default quota;
