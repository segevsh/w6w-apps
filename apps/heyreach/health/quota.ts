import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much of HeyReach's rate limit is left? — nothing readable, so the absence
 * is declared rather than guessed at.
 *
 * Verified 2026-09-22 against HeyReach's own OpenAPI 3.1 document
 * (`https://docs.heyreach.io/openapi.json`, read in full) and a live probe:
 *
 *  - Every operation in the document declares a **`429 Too Many Requests`**
 *    response — so a limit exists — but the document names **no rate-limit
 *    header anywhere** (`X-RateLimit-*`, `RateLimit-*`, `Retry-After`: zero
 *    occurrences in 256 KB of JSON).
 *  - No endpoint reports a remaining allowance: there is no account, usage or
 *    quota operation in the 87 paths, and the app's own probe
 *    (`GET /api/public/auth/CheckApiKey`, live) returns a bare status with no
 *    headers beyond `server`, `date` and the framework's security headers.
 *
 * So headroom can only be budgeted from observed failures, and a workflow
 * should treat a 429 as "slow down and retry" rather than as a broken
 * connection — which is what `lib/client.ts`'s error formatter says.
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in a roll-up, so at any other severity
 * this would pin the app's verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Not exposed: HeyReach's document declares a 429 on every operation but no rate-limit " +
    "header and no quota endpoint.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "HeyReach documents a 429 response on every operation but publishes no rate-limit header " +
      "(no X-RateLimit-*, RateLimit-* or Retry-After occurrence in the whole 256 KB OpenAPI " +
      "document) and no account/usage/quota endpoint; a live probe of /api/public/auth/" +
      "CheckApiKey on 2026-09-22 carried none either. Headroom cannot be read, only budgeted " +
      "from observed 429s.",
  },
};

export default quota;
