/**
 * Do we have API quota left? — declared absent, not guessed.
 *
 * Checked against the live OpenAPI document (`https://docs.perplexity.ai/openapi.json`,
 * fetched 2026-08-16) and live response headers on `/v1/sonar`, `/search`,
 * `/v1/embeddings`, and `/v1/models`: none carries an `x-ratelimit-*` header
 * or anything like one (measured via `curl -sD -`, 2026-08-16). The response
 * `usage` objects on chat completions and embeddings report *consumption*
 * (tokens spent) but never a remaining balance or a limit to divide it by.
 *
 * The only usage-metering surfaces the API documents are
 * `GET /v1/analytics/computer/usage` and `GET /v2/analytics/computer/usage` —
 * and both require a **separate organization analytics API key**, minted by
 * an org admin from Settings > Organization > Computer, distinct from the
 * per-user API key this app's `auth/api-key.ts` collects. A normal API key
 * cannot call either, so they cannot be this app's quota probe. They also
 * cover Perplexity's browser-automation "Computer" product's credit spend,
 * not the chat-completion/search/embeddings token budget this app calls.
 *
 * `unavailable` is the honest answer per `rfcs/healthcheck.md` "Declaring
 * absence". `severity: "informational"` so it never pins the roll-up verdict
 * at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  description: "Not exposed: no response carries a rate-limit header, and the only usage-" +
    "metering endpoints require a separate organization analytics key this app does not collect.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "No x-ratelimit-* headers on any endpoint, and the documented usage-analytics " +
      "endpoints need a separate org-admin analytics key, not the per-user API key this app uses.",
  },
};

export default quota;
