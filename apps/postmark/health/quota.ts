/**
 * How much sending headroom is left on THIS server — declared absent,
 * honestly.
 *
 * Postmark exposes neither of the two usual signals a `quota` check reads:
 *
 *   - No rate-limit response headers. The API overview
 *     (`postmarkapp.com/developer/api/overview`, fetched 2026-08-02)
 *     documents only that a 429 is returned "when you are making requests at
 *     a rate that exceeds acceptable use" — no `X-RateLimit-*`/`Retry-After`
 *     contract is published, and no such headers were observed on live
 *     responses during this app's research.
 *   - No remaining-sends/credits endpoint. Postmark retired credit-based
 *     plans in 2023 in favor of monthly subscriptions; `GET /server` (the
 *     richest account-scoped read a server token can make) returns
 *     configuration only, no send-count or plan-limit fields. Account-level
 *     billing detail exists in the Postmark web app, not the REST API this
 *     app is scoped to (server-token only — see README.md "Auth").
 *
 * Per rfcs/healthcheck.md: "Say so when a vendor publishes nothing" — an
 * `unavailable` entry is a first-class answer, not an omission, and
 * `severity: "informational"` keeps a permanent `unknown` from pinning this
 * App's roll-up verdict (an `unavailable` entry always reports `unknown`,
 * which would otherwise cap every verdict there forever).
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Sending quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Postmark publishes no rate-limit response headers (only an undocumented 429 threshold) " +
      "and no API for remaining sends/credits — it moved off credit-based plans in 2023. " +
      "GET /server (the richest server-scoped read) returns configuration only, no quota " +
      "figures. Humans can check usage at https://account.postmarkapp.com by hand.",
  },
};

export default quota;
