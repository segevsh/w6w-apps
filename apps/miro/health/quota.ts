/**
 * How much headroom is left — Miro publishes the *cost*, never the *balance*.
 *
 * Checked before being written off, because Miro's metering is unusually
 * well documented and the temptation is to assume a header exists:
 *
 *   - Miro meters in **credits**, not requests, and its OpenAPI document
 *     records the tier of every single operation in that operation's own
 *     description ("Rate limiting: Level 1 / Level 2 / Level 4"). It even spells
 *     out the arithmetic for bulk calls: creating one sticky note, one card and
 *     one shape in a single `POST /v2/boards/{id}/items/bulk` costs 300
 *     credits, "because create item calls take Level 2 rate limiting of 100
 *     credits each".
 *   - So the **cost** side is knowable per call. The **remaining** side is not:
 *     the document declares response headers on exactly two names across all
 *     114 paths — `ETag` and `Location` — and the string `x-ratelimit` does not
 *     appear anywhere in it. `429` responses are declared, but only as an
 *     outcome, with nothing to read beforehand.
 *   - A live call carries nothing either: `POST /v1/oauth/token` answers 401
 *     with only Miro's error envelope and no rate-limit headers (verified
 *     2026-08-18).
 *
 * A probe could therefore only report a number it invented. Exhaustion surfaces
 * as a 429 on the next call, which the client already raises with Miro's own
 * `code` intact.
 *
 * Declared rather than omitted: a host should be able to tell "we cannot know"
 * from "nobody looked". `severity: "informational"` because an `unavailable`
 * entry always reports `unknown`, and an informational check never worsens a
 * roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API credit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Miro meters in credits with a documented per-endpoint tier (Level 1 = 50 credits, " +
      "Level 2 = 100, and bulk calls multiply per item), but publishes no remaining-balance " +
      "endpoint and no rate-limit response headers: its OpenAPI document declares only " +
      "`ETag` and `Location` across all 114 paths and contains no `x-ratelimit` header at " +
      "all, and a live call returns none (verified 2026-08-18). The per-call cost is " +
      "knowable; the headroom is not. Exhaustion surfaces as a 429.",
  },
};

export default quota;
