/**
 * How much headroom is left — Snyk publishes nothing to read.
 *
 * Worth checking rather than assuming, because Snyk's document is unusually
 * thorough about response headers: it declares nine of them
 * (`snyk-request-id`, `snyk-version-requested`, `snyk-version-served`,
 * `snyk-version-lifecycle-stage`, `deprecation`, `sunset`, `retry-after`,
 * `content-location`, `location`) — and **not one is a rate-limit header**. The
 * strings `ratelimit` and `x-ratelimit` do not appear anywhere in the 192-path
 * document, and only 2 of its 290 operations declare a `429` at all.
 *
 * A live call carries none either: an unauthenticated `GET /self` returns 401
 * with only `snyk-request-id` (verified 2026-08-18).
 *
 * What Snyk does publish is `retry-after`, which the API sends *after* you have
 * been limited. That is a backoff instruction, not headroom — it answers "how
 * long to wait", not "how much is left" — so there is nothing for a periodic
 * probe to report.
 *
 * Declared rather than omitted: a host should be able to tell "we cannot know"
 * from "nobody looked". `severity: "informational"` because an `unavailable`
 * entry always reports `unknown`, and an informational check never worsens a
 * roll-up verdict.
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
      "Snyk's API document declares nine response headers and none of them reports rate-limit " +
      "headroom; `ratelimit`/`x-ratelimit` appear nowhere in its 192 paths, and only 2 of 290 " +
      "operations declare a 429 (verified 2026-08-18). The `retry-after` header Snyk does " +
      "publish is a backoff instruction sent after limiting, not a remaining balance a probe " +
      "could read in advance.",
  },
};

export default quota;
