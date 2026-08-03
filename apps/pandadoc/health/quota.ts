import type { HealthCheckDefinition } from "@w6w/types";

/**
 * PandaDoc publishes rate limits but nothing to read headroom from, so there is
 * nothing to probe. Declared rather than omitted: a host should be able to tell
 * "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and an
 * informational check never worsens a roll-up verdict.
 *
 * ## What was checked
 *
 * Verified 2026-08-03 against the vendor's own reference
 * (`developers.pandadoc.com/reference/limits`) and against live responses:
 *
 *   - The limits are real, published, and **per-endpoint-family** rather than a
 *     single account budget — a sliding 60-second window, measured in requests
 *     per minute: Create Document 500, Send Document 400, Document Details 600,
 *     list/status/delete 2000, Download Document 100, and a blanket 10 RPM for
 *     every endpoint under a sandbox key. PandaDoc states explicitly that the
 *     buckets are not cumulative.
 *   - Exceeding one answers `429`.
 *   - But the reference documents **no rate-limit response headers**, and none
 *     are sent: a live `GET /public/v1/documents` (401) and a live
 *     `GET /public/v1/members/current` with a bogus key (401) both come back
 *     with no `X-RateLimit-*`, no `RateLimit-*`, and no `Retry-After` — only
 *     `x-request-id`, `x-request-source`, `traceparent` and Imperva CDN
 *     headers. There is likewise no usage or quota endpoint anywhere in the
 *     reference (the API-log routes report calls made, not allowance left).
 *
 * So headroom against a *per-family* limit could only be reconstructed by this
 * app counting its own calls per bucket — which would be a guess about traffic
 * from every other client of the same key, not a reading. A guess reported as a
 * quota figure is worse than an honest absence.
 *
 * The one operationally useful fact this cannot express: a **sandbox** key's
 * 10 RPM ceiling is low enough to be hit by ordinary use, and the only symptom
 * is a `429`. `auth/api-key.ts` says so where someone pasting a key will read it.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "PandaDoc publishes per-endpoint rate limits (a sliding 60s window; 500 RPM create, 400 send, 600 details, 2000 list/status/delete, 100 download, 10 for sandbox keys) but exposes no way to read headroom: no usage endpoint, and no `X-RateLimit-*` / `RateLimit-*` / `Retry-After` response headers — confirmed live. Exhaustion is only observable as a 429.",
  },
};

export default quota;
