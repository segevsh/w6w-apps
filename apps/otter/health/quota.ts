/**
 * Do we have rate-limit headroom left? — not knowable, declared as a
 * positive fact.
 *
 * The docs state a fixed ceiling — "Enterprise plan users are currently
 * limited to 10 requests / second. If you exceed your rate limit, you'll
 * receive a `429 Too Many Requests` response" — but nothing about it is
 * observable before you hit it:
 *
 *  - **No rate-limit headers of any kind.** Measured live 2026-09-29 against
 *    `api.otter.ai/v1/workspace` and `/v1/channels`, both unauthenticated and
 *    with a syntactically-plausible-but-wrong bearer: every response carried
 *    only `date`, `content-type`, `content-length` and
 *    `strict-transport-security`. No `X-RateLimit-*`, `RateLimit-*` or
 *    vendor-prefixed equivalent on a 401, and the docs' own endpoint
 *    reference names no header on a 200 either.
 *  - **No usage/limits endpoint.** Nothing in the documented surface (
 *    channels, conversations, workspace) reports remaining request count —
 *    `GET /workspace` returns organizational metadata, not API consumption.
 *
 * A probe would also be self-defeating: the only way to observe the counter
 * is to spend it, at a ceiling as tight as 10 requests/second.
 *
 * `severity: "informational"` is required, not stylistic: an `unavailable`
 * entry always reports `unknown`, and `unknown` outranks `ok` in the
 * roll-up, so at any other severity this would pin the app's verdict at
 * `unknown` permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Otter documents a fixed 10 requests/second (Enterprise) ceiling enforced by a bare 429, " +
      "but exposes no rate-limit header of any kind (measured live 2026-09-29: only date, " +
      "content-type, content-length and strict-transport-security on both an unauthenticated " +
      "and a bad-bearer response) and no usage/limits endpoint. A probe would also spend the " +
      "very allowance it claims to measure.",
  },
};

export default quota;
