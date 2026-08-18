/**
 * EasyPost's published limit is a **burst** limit, not a quota — and that
 * distinction is the whole reason this is not a probe.
 *
 * ## What is documented
 *
 * Verified 2026-08-18 against EasyPost's rate-limiting guide: **five requests
 * per second across index (list) endpoints**, returning `429` when exceeded.
 * Separately, a rating request considers at most **60 carrier accounts**, and
 * exceeding that does not fail — the call succeeds using the first sixty, which
 * is a quieter failure than an error.
 *
 * ## Why there is nothing to poll
 *
 * A per-second burst limit has no meaningful headroom to report. There is no
 * balance being consumed, no window to be part-way through, and no state that
 * persists between one second and the next — asking "how much is left" is not a
 * question the limit has an answer to. EasyPost publishes no usage endpoint and
 * documents no `Retry-After` or `X-RateLimit-*` header either.
 *
 * A check could therefore only ever report `unknown`, at the cost of a request
 * against the very limit it was watching. The consequence is surfaced where it
 * can be acted on instead: a `429` from this app says the limit is a burst and
 * that spacing the calls out fixes it, rather than implying a quota that will
 * refill tomorrow.
 *
 * **Account balance is a different thing and is not this check** — it is read
 * by `account`, because running out of balance stops label purchases while the
 * API keeps answering.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "EasyPost's documented limit is a BURST limit, which has no headroom to report. " +
      "Verified 2026-08-18: five requests per second across index endpoints, returning 429 when " +
      "exceeded — there is no balance being consumed and no window to be part-way through, so " +
      "'how much is left' is not a question the limit answers. EasyPost publishes no usage " +
      "endpoint and documents no `Retry-After` or `X-RateLimit-*` header. A separate undocumented-" +
      "as-an-error ceiling applies to rating: a request considers at most 60 carrier accounts and " +
      "silently uses the first 60 beyond that. The 429 is surfaced on the call that hit it, " +
      "saying that spacing calls out fixes it rather than implying a quota that refills. Account " +
      "BALANCE, which does deplete, is read by the `account` check instead.",
  },
};

export default quota;
