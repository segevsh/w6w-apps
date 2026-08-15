/**
 * Quota headroom — declared unavailable, and why that is the honest answer.
 *
 * Thinkific's "REST API Rate Limits" support article
 * (`support.thinkific.dev/hc/en-us/articles/4422684774935`, fetched
 * 2026-08-15) documents two limits: **120 requests/minute** per Site, and a
 * **10 concurrent in-flight requests** ceiling. Both produce a `429` when
 * exceeded, and the 429 carries one header — `RateLimit-Reset` (epoch
 * milliseconds until the window clears) — with no remaining-count header
 * alongside it.
 *
 * Crucially, the article documents that header appearing **only on the 429
 * itself**, and every response observed live on 2026-08-15 against
 * `api.thinkific.com` (401s, both the API-key and bearer path) carried no
 * `RateLimit-Limit`, `RateLimit-Remaining`, `X-RateLimit-*` or any other
 * quota-shaped header either — this app holds no live credential to provoke a
 * real 2xx, but nothing in the docs or in what is actually observable
 * suggests one appears there. So there is nothing this check could read
 * *before* the account is already being throttled: reporting a number here
 * would mean fabricating one between requests, and reporting "ok" until the
 * first 429 would just be `service`'s job with extra steps.
 *
 * Compare Apify (`apps/apify/health/request-rate.ts`) and BigCommerce, which
 * hit the identical shape — a rate ceiling with no advance-remaining signal —
 * and declare the same way. `severity: "informational"` is mandatory for a
 * declared absence: `unavailable` always reports `unknown`, which outranks
 * `ok` in the roll-up, so any other severity would pin this App at `unknown`
 * permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason:
      "Thinkific enforces 120 requests/minute and 10 concurrent requests per Site, but exposes " +
      "no remaining-count header on ordinary responses — only a 429 carries RateLimit-Reset, by " +
      "which point the limit has already been hit. There is nothing to read proactively.",
  },
};

export default quota;
