import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declared absence, not guessed: the Gemini Developer API exposes no
 * headroom endpoint and no rate-limit response headers. Checked live
 * 2026-08-16 — an unauthenticated and a bad-key request to `/v1beta/models`
 * both come back with the standard Google API error headers (`vary`,
 * `content-type`, `x-xss-protection`, …) and nothing resembling
 * `x-ratelimit-*` / `x-goog-quota-*`. The discovery document (`$discovery/rest`)
 * lists no `quota` or `usage` resource either — rate limits (requests/tokens
 * per minute, per day) are documented per-model, per-tier numbers on
 * https://ai.google.dev/gemini-api/docs/rate-limits, visible only in the AI
 * Studio console, not through the API.
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin this App's verdict at `unknown`
 * forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "No headroom endpoint or quota response headers are documented or observed on the " +
      "Gemini Developer API; rate limits are per-model/per-tier figures visible only in the " +
      "AI Studio console.",
  },
};

export default quota;
