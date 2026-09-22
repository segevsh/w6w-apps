import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Streamtime publishes no quota, credit or rate-limit surface — declared, not
 * left as a gap.
 *
 * ## What was checked
 *
 *  - **The OpenAPI document.** The words "rate limit", "quota" and "throttle"
 *    do not occur anywhere in `https://api.streamtime.net/swagger.json`
 *    (348,536 bytes, fetched 2026-09-22). There is no usage, plan or balance
 *    endpoint to read.
 *  - **The wire.** Every response observed on 2026-09-22 — the 401s from
 *    `/organisation`, `/branches`, `/users`, `/search/setup`, `/report/setup`
 *    and an unknown path — carried no `X-RateLimit-Limit`,
 *    `X-RateLimit-Remaining`, `RateLimit-*` or `Retry-After` header of any
 *    kind. Headers were: `content-type`, `date`, `server`, `x-powered-by`,
 *    `strict-transport-security`, `via`, `x-amz-cf-*` (CloudFront), `alt-svc`,
 *    and assorted hardening headers.
 *
 * An authenticated call cannot be made from here (the app ships no credential),
 * so this is a declared absence with a stated basis rather than a probe that
 * failed once. If a future release adds a meter, the header on an ordinary
 * read would be the first place it appears.
 *
 * ## Why `severity: "informational"` is load-bearing
 *
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in a health roll-up, so at any severity but `informational` a declared
 * absence pins the whole App at `unknown` forever — the failure mode where a
 * perfectly healthy app never reads as healthy.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  title: "Quota headroom",
  description:
    "Declared unavailable: Streamtime's API document describes no quota or usage endpoint, and " +
    "no response carries a rate-limit or retry header.",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Streamtime publishes no quota or rate-limit surface: the swagger document mentions " +
      "neither, and no response header carries a limit, a remaining count or a retry hint. " +
      "There is nothing to read, so nothing is probed.",
  },
};

export default quota;
