import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Procore throttles API calls (a `429` when exceeded), but no rate-limit
 * headroom could be confirmed: the headers on an unauthenticated response carry
 * no `X-RateLimit-*` counter (only `x-complexity-score`), the developer docs are
 * client-rendered and could not be read as text, and no headroom endpoint is in
 * the OpenAPI spec. Declared absent rather than guessed.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and an
 * informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No rate-limit headroom endpoint appears in Procore's OpenAPI reference, and no rate-limit " +
      "header could be confirmed on live responses.",
  },
};

export default quota;
