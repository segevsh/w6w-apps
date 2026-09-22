import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Practice Better publishes no readable quota, so there is nothing to probe —
 * stated as a positive fact rather than left as a gap.
 *
 * Verified 2026-09-22 against the vendor's own OpenAPI 3.0 document
 * (`https://api-docs.practicebetter.io/swagger.json`, 69 paths): the whole
 * document was searched for `ratelimit`, `rate-limit`, `retry-after` and
 * `x-rate`, and there are **zero hits** — no rate-limit response header is
 * documented on any operation, and there is no endpoint reporting remaining
 * allowance or account usage. `429` is declared as a possible response on
 * operations, so throttling exists; it is simply not measurable in advance.
 * Headroom can therefore only be budgeted from observed refusals, which is what
 * `lib/client.ts`'s error formatter says on a 429.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * `unknown` outranks `ok` in the roll-up, so at any other severity declaring
 * this absence would pin the app's verdict at `unknown` permanently. Declaring
 * it keeps the distinction between "we cannot know" and "nobody looked".
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Practice Better's API publishes no rate-limit response header and no endpoint reporting " +
      "remaining allowance or account usage — the whole OpenAPI document contains no " +
      "`ratelimit`/`retry-after`/`x-rate` text at all. A 429 is declared, so throttling exists, " +
      "but headroom cannot be read in advance — only budgeted from observed failures.",
  },
};

export default quota;
