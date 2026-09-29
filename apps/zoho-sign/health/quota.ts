/**
 * Zoho Sign publishes no per-response quota or rate-limit header for this app to read.
 *
 * Checked 2026-09-29: `https://www.zoho.com/sign/api/api-limitations.html` documents real
 * limits (most calls capped at 50/minute; tighter per-endpoint ceilings such as 2/minute for
 * exporting templates and 1/minute for importing them; per-request document/recipient/field
 * counts) — but none of that is exposed as a *response header* the way Zoho CRM's
 * `X-API-CREDITS-REMAINING` is. A live unauthenticated `GET /templates` (and the same call
 * with a bad token) carries no `X-RateLimit-*` or similarly named header at all — only the
 * standard `server`/`content-type`/`set-cookie`/`strict-transport-security` set. There is
 * nothing to probe ahead of the eventual `429` itself, so this is declared as a positive
 * absence rather than a silent gap — see `packages/apps/HEALTHCHECKS.md`.
 *
 * `severity: "informational"` is required here, not a style choice: an `unavailable` check
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up — at any other
 * severity this would pin the whole App's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Zoho Sign documents per-minute/per-endpoint request limits, but exposes no X-RateLimit-* " +
      "(or equivalent) response header to probe headroom ahead of a 429 (verified live 2026-09-29).",
  },
};

export default quota;
