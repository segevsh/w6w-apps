/**
 * Do we have quota left? — not knowable, declared as a positive fact.
 *
 * Browserless meters a monthly UNIT allowance (browser time in 30-second
 * increments, plus proxy bandwidth and CAPTCHA solves). The documented way to
 * read it is `GET https://api.browserless.io/v1/account/usage`, but the vendor
 * publishes no response schema for it, and no REST response (checked on the
 * 2026-10-06 unauthenticated probes, and in the docs) carries a rate-limit or
 * remaining-units header. The only per-moment limits are plan concurrency and a
 * queue, signalled by a `429` once full. A headroom check would be a guess at an
 * undocumented body, so none is shipped; the `account-usage-get` action returns
 * the usage document unmodified for a workflow to read.
 *
 * `severity: "informational"`: an `unavailable` entry always reports `unknown`,
 * which would otherwise pin the app's verdict there permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Unit allowance headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Browserless documents the Usage API but publishes no response schema and no " +
      "rate-limit or remaining-units header on any REST response.",
  },
};

export default quota;
