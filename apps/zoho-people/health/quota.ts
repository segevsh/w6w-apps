/**
 * Zoho People publishes no per-response quota header for this app to read.
 *
 * Checked 2026-10-06: `https://www.zoho.com/people/api/api-limits.html`
 * documents a per-plan daily allowance (250 calls per user licence per day,
 * capped at 5,000 / 10,000 / 15,000 / 25,000 on Essential HR / Professional /
 * Premium / Enterprise) plus a per-endpoint per-minute threshold with a lock
 * period — but a live request against `people.zoho.com` carries no
 * `X-RateLimit-*` or similar header (response headers inspected, 2026-10-06).
 * Nothing to probe ahead of the lock itself, so this is a declared absence.
 *
 * `severity: "informational"` is required: an `unavailable` check always
 * reports `unknown`, which would otherwise pin the App's verdict forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API call headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "Zoho People documents per-plan daily call allowances and per-endpoint per-minute " +
      "thresholds with lock periods, but exposes no X-RateLimit-* (or equivalent) response " +
      "header to probe headroom ahead of a lock (verified live 2026-10-06).",
  },
};

export default quota;
