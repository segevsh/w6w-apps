import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much of this workspace's Synthflow capacity is left?
 *
 * There is nothing to read. The OpenAPI document (fetched 2026-10-05) declares no `429`
 * response on any of its 69 paths and no rate-limit header, and a live `401` probe of
 * `GET /assistants/` carried no `X-RateLimit-*`, `RateLimit-*` or `Retry-After` header on
 * the Global or EU host. Concurrency and calls-per-second limits are documented only as
 * prose ("Concurrency" guide) and enforced per workspace plan; no endpoint reports them.
 *
 * `severity: "informational"` — an `unavailable` entry always reports `unknown`, and
 * `unknown` outranks `ok`, so any other severity would pin the verdict at `unknown`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Capacity headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Synthflow's OpenAPI document declares no 429 response and no rate-limit header, and a live " +
      "401 probe (2026-10-05) carried none; concurrency and call-rate limits are plan settings " +
      "described only in the docs, with no endpoint that reports usage or headroom.",
  },
};

export default quota;
