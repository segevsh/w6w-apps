/**
 * Zoho Cliq publishes no per-response quota or rate-limit header for this app
 * to read.
 *
 * Checked 2026-10-06: the REST reference documents a per-endpoint, per-user
 * quota under every endpoint ("The quota limit for this API is N requests per
 * minute per user", some with a lock period once exceeded — e.g. reactions: 20
 * per minute, 5-minute lock), while its "API Call Limit" section says only
 * "There is no usage limit on the API". None of it is exposed as a response
 * header: a live `GET /api/v2/channels` on `cliq.zoho.eu` with a dead token
 * carries no `X-RateLimit-*` (or similar) header. The limit is per-endpoint,
 * so there is also no single number a quota check could report. Declared as a
 * positive absence rather than a silent gap — see `packages/apps/HEALTHCHECKS.md`.
 *
 * `severity: "informational"` is required, not a style choice: an
 * `unavailable` check always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up — at any other severity this would pin the whole App's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Zoho Cliq documents per-endpoint, per-user request quotas (calls per minute, some with a " +
      "lock period), but exposes no X-RateLimit-* (or equivalent) response header to probe " +
      "headroom ahead of a rejection (verified live 2026-10-06).",
  },
};

export default quota;
