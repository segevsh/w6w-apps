import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Typeform exposes no headroom to read, so there is nothing to probe. Declared
 * rather than omitted, for the same reason as an absent status service: a host
 * should be able to tell "we cannot know" from "nobody looked".
 *
 * The Create and Responses APIs enforce roughly **2 requests per second per
 * account**, but that budget is enforced by a `429` rather than surfaced — the
 * responses carry no `X-Rate-Limit-*` / `RateLimit-*` headers (verified against
 * the developer docs on 2026-07-27), so there is no live counter to report.
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
      "Typeform publishes no headroom endpoint and returns no rate-limit headers. The documented allowance is ~2 requests/second per account on the Create and Responses APIs, enforced by 429 rather than reported.",
  },
};

export default quota;
