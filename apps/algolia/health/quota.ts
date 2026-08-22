/**
 * How much headroom is left — Algolia publishes nothing to read.
 *
 * Checked in two places before being written off:
 *
 *   - **Algolia's OpenAPI document** (Search API v1.0.0, 60 paths) declares
 *     **no response headers at all** and **no `429` response** on any
 *     operation. The string `x-ratelimit` does not appear in it.
 *   - Algolia's own metering is a **plan quota** — records, search operations
 *     and indexing operations per month — reported on the dashboard's usage
 *     page, not on the API. There is no endpoint that returns remaining
 *     operations for the calling application.
 *
 * So a probe could only report a number it invented. The one thing the API does
 * expose about limits is per-key, not per-plan: `GET /1/keys/{key}` returns
 * `validity`, `maxQueriesPerIPPerHour` and `maxHitsPerQuery` — the key's own
 * ceilings, not consumption against them — and the auth `test` hook already
 * reads that endpoint to record a connection's ACLs.
 *
 * Declared rather than omitted: a host should be able to tell "we cannot know"
 * from "nobody looked". `severity: "informational"` because an `unavailable`
 * entry always reports `unknown`, and an informational check never worsens a
 * roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Algolia meters records and operations against a monthly plan quota reported on the " +
      "dashboard, with no API that returns remaining headroom for the calling application. " +
      "Its OpenAPI document declares no response headers and no 429 on any of its 60 paths " +
      "(verified 2026-08-18). `GET /1/keys/{key}` exposes a key's own ceilings " +
      "(maxQueriesPerIPPerHour, maxHitsPerQuery) but not consumption against them.",
  },
};

export default quota;
