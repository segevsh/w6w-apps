/**
 * Do we have generation credits left? — declared absent, not guessed.
 *
 * APITemplate.io bills per-generation against an account credit balance, but
 * neither the v2 REST API nor its official SDKs (checked 2026-08-01 against
 * the Python SDK's generated docs, which enumerate every response schema and
 * every endpoint) expose that balance: no account/credits/usage endpoint
 * exists, and none of `create-image`/`create-pdf`/`list-templates`/
 * `list-objects`'s documented response fields or headers carry a remaining-
 * credit count, a rate-limit header, or a reset time. The only usage signal
 * documented anywhere is a bare HTTP 429 on the generation endpoints once a
 * plan's concurrency limit is hit — a fact, not a number, and not something a
 * side-effect-free probe can observe without spending a generation to find it.
 *
 * `unavailable` is the honest answer per rfcs/healthcheck.md "Declaring
 * absence". `severity: "informational"` so it never pins the roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Generation credit headroom",
  description:
    "Not exposed: APITemplate.io's v2 API and SDKs document no account/credits/usage endpoint or quota response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No account/credits endpoint or quota headers are documented anywhere in the v2 API or its official SDKs.",
  },
};

export default quota;
