/**
 * WorkOS's rate limit is real, and it is not observable ahead of time.
 *
 * ## What was measured
 *
 * `GET https://api.workos.com/organizations?limit=1` on 2026-08-18 returned
 * **no `x-ratelimit-*` header of any kind**. The full header set was
 * `date, content-type, content-length, cf-ray, cf-cache-status, etag, server,
 * strict-transport-security, vary, access-control-allow-credentials,
 * content-security-policy, expect-ct, referrer-policy, x-content-type-options,
 * x-dns-prefetch-control, x-download-options, x-envoy-upstream-service-time,
 * x-frame-options, x-permitted-cross-domain-policies, x-request-id,
 * x-xss-protection` — Cloudflare and Envoy plumbing, and nothing about
 * consumption.
 *
 * WorkOS publishes no usage endpoint either.
 *
 * ## Why that makes this a declared absence rather than a probe
 *
 * A quota check is only worth running if it can answer *before* the limit
 * bites. What WorkOS gives is a `429` **at** the limit, with `Retry-After` — a
 * fact about the request that just failed, not headroom. A check that reported
 * `ok` until the moment it reported `down` would be an alarm that goes off
 * during the fire, and it would burn a request each interval to say nothing.
 *
 * So this states the absence, and the runtime surfaces the `429` where it
 * belongs: on the call that hit it, via `describeError`.
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
    reason: "WorkOS exposes no consumption signal to read. Verified 2026-08-18: a response from " +
      "api.workos.com carries no `x-ratelimit-*` header at all — the header set is Cloudflare " +
      "and Envoy plumbing (cf-ray, x-envoy-upstream-service-time, x-request-id) plus the usual " +
      "security headers — and WorkOS publishes no usage endpoint. The only signal is the `429` " +
      "with `Retry-After` returned AT the limit, which describes the request that just failed " +
      "rather than remaining headroom. A poll would therefore spend a request per interval to " +
      "report `ok` until the moment it reported `down`, so the 429 is surfaced on the call that " +
      "hit it instead.",
  },
};

export default quota;
