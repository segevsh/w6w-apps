/**
 * Ashby publishes a rate limit for two endpoints and nothing for the rest.
 *
 * ## What is documented
 *
 * The **report** endpoints — `report.generate` and `report.synchronous` — are
 * limited to **15 requests per minute per organization**, with **at most 3
 * report operations running at once**, shared between the two; polling an
 * already-started generation bypasses both. Exceeding either returns `429`.
 *
 * For every other endpoint — candidates, applications, jobs, interviews,
 * offers, the whole surface this app uses — Ashby documents **no limit at
 * all**, and sends no rate-limit header on a successful response.
 *
 * ## Why that makes this a declared absence
 *
 * There is nothing to read. No usage endpoint, no `X-RateLimit-*` header, and a
 * published limit that applies to two endpoints this app deliberately does not
 * implement. A check could only produce `unknown` on every run, at the cost of
 * a request each time.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Ashby exposes no consumption signal. Verified 2026-08-18 against its published " +
      "reference: the only documented limits are on the REPORT endpoints — `report.generate` " +
      "and `report.synchronous` share 15 requests per minute per organization and a maximum of " +
      "3 concurrent report operations, with polling exempt — and this app implements neither. " +
      "No limit is published for candidates, applications, jobs, interviews or offers, no " +
      "successful response carries an `X-RateLimit-*` header, and there is no usage endpoint. " +
      "A probe could only ever answer `unknown`, at the cost of a request per interval.",
  },
};

export default quota;
