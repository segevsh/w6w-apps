/**
 * Do we have API headroom left? — declared absent, not guessed.
 *
 * Neither `apidocs.thrivecart.com` (the published Postman collection) nor
 * `developers.thrivecart.com` documents a rate limit, a quota endpoint, or
 * any `X-RateLimit-*`-style header. Live probing on 2026-08-15 confirmed it:
 * no response observed — success or 401 — carried any such header. There is
 * no number here to read, and nothing a side-effect-free probe could spend a
 * request to discover either.
 *
 * `unavailable` is the honest answer per `rfcs/healthcheck.md` "Declaring
 * absence". `severity: "informational"` so it never pins the roll-up
 * verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API headroom",
  description: "Not exposed: ThriveCart documents no rate limit, quota endpoint, or " +
    "X-RateLimit-* response headers anywhere in its published API reference.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "No quota endpoint or rate-limit headers are documented or observed on the wire.",
  },
};

export default quota;
