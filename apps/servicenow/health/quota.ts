import type { HealthCheckDefinition } from "@w6w/types";

/**
 * ServiceNow ships no reliable, always-on quota signal to probe.
 *
 * `Retry-After` only appears once a 429 has already happened — nothing to
 * read proactively. The documented `X-RateLimit-*` headers are opt-in: they
 * only appear once an admin creates inbound REST rate-limit rules for this
 * instance (most do not), and are reported inconsistently even then. There is
 * no endpoint analogous to GitHub's `/rate_limit` or Zendesk's always-present
 * `ratelimit-*` headers to fall back to.
 *
 * Declaring this absent rather than polling a header that may or may not
 * exist keeps the check honest: a host would otherwise see `unknown` forever
 * for admins who never opted into rate-limit rules, indistinguishable from a
 * probe that is silently broken.
 *
 * `severity: "informational"` for the same reason as `service`: an
 * `unavailable` entry always reports `unknown`, and only `informational`
 * keeps that from pinning every verdict at `unknown`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No always-present quota signal exists. `X-RateLimit-*` headers only appear when an admin has configured inbound REST rate-limit rules for this instance, and are reported inconsistently even then; `Retry-After` only appears after a 429 has already happened.",
  },
};

export default quota;
