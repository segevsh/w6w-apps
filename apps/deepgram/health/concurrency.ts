/**
 * Deepgram's real limit is **concurrency**, and it cannot be observed.
 *
 * ## Why this deserves its own entry
 *
 * Most APIs meter requests per minute. Deepgram meters **how many requests are
 * in flight at once**, per plan and per surface — verified 2026-08-18 against
 * its published reference:
 *
 *   - pay-as-you-go: up to **50** concurrent pre-recorded speech-to-text
 *     requests, **150** streaming, **15** text-to-speech REST, and **5 to 10**
 *     for audio intelligence;
 *   - growth: **225** streaming in North America, 150 elsewhere;
 *   - enterprise: starting at **300** streaming.
 *
 * That difference matters to a workflow author. Hitting a per-minute limit is
 * fixed by waiting; hitting a concurrency limit is fixed by **running fewer
 * steps in parallel**, and a retry loop that backs off and then fires
 * everything again at once hits it exactly as hard the second time. So the
 * `429` message says that rather than "rate limited".
 *
 * ## Why it is a declared absence
 *
 * There is nothing to read. Deepgram publishes no endpoint reporting current
 * concurrency, its documentation does not name the status code or any
 * `Retry-After` / `X-RateLimit-*` header for the limit, and a probe would have
 * to *be* a concurrent request to learn anything — measuring the thing by
 * consuming it.
 *
 * The credit balance, which *can* be read, is the `quota` check.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const concurrency: HealthCheckDefinition = {
  key: "concurrency",
  title: "Concurrent request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Deepgram limits CONCURRENT requests rather than requests per minute, and publishes " +
      "no way to observe them. Verified 2026-08-18: the documented ceilings are per plan and per " +
      "surface — pay-as-you-go allows up to 50 concurrent pre-recorded speech-to-text requests, " +
      "150 streaming, 15 text-to-speech REST and 5-10 for audio intelligence, with growth and " +
      "enterprise higher — but there is no endpoint reporting current concurrency, and the " +
      "reference names no status code or `Retry-After` / `X-RateLimit-*` header for the limit. A " +
      "probe would have to BE a concurrent request to measure concurrency. The consequence is " +
      "surfaced where it can be acted on instead: a 429 from this app says to run fewer steps in " +
      "parallel rather than to wait longer. Pre-paid credit, which can be read, is the `quota` " +
      "check.",
  },
};

export default concurrency;
