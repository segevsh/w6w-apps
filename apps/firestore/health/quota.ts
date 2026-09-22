import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Firestore exposes no headroom to read, so there is nothing to probe. Declared
 * rather than omitted, so a host can tell "we cannot know" from "nobody looked".
 *
 *   - The discovery document declares no quota or rate-limit response headers
 *     and no headroom endpoint anywhere in `projects.databases.documents`.
 *     Firestore's limits — document writes per second per database, concurrent
 *     connections, stored bytes, index-entry counts — live in Google Cloud's
 *     quota system, are visible in the Cloud Console and Cloud Monitoring, and
 *     are not part of this API's surface at all.
 *   - Exhaustion surfaces as a `429 RESOURCE_EXHAUSTED` (or a `403` with reason
 *     `quotaExceeded`), which the client raises with Google's error envelope
 *     intact — so a workflow sees the real reason rather than a bare "failed".
 *   - What *is* knowable is the `(default)` database's free-tier usage, but only
 *     through the separate Cloud Monitoring API and a broader scope than this app
 *     requests. Reading it would widen every Connection's grant for a report
 *     nobody asked for.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Firestore publishes no headroom endpoint and no rate-limit response headers (verified " +
      "2026-09-22 against the v1 discovery document). Its limits are per-project, counted in " +
      "operations, stored bytes and index entries, and visible only in the Google Cloud " +
      "console / Cloud Monitoring. Exhaustion surfaces as 429 `RESOURCE_EXHAUSTED` or a 403 " +
      "whose reason is `quotaExceeded`.",
  },
};

export default quota;
