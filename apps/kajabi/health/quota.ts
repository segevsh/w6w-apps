import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Kajabi publishes no rate limit and no usage counter — so this declares
 * `unavailable` with a reason rather than pretending to probe one.
 *
 * ## Checked four ways, not assumed
 *
 * A vendor that documents no limit usually still enforces one, so absence was
 * established rather than inferred. All on 2026-08-03:
 *
 *  1. **Nothing in the OpenAPI document.** A case-insensitive search of the
 *     generated spec (12,530 lines) for `rate limit`, `ratelimit`, `quota`,
 *     `throttl`, `429` and `x-ratelimit` returns **zero** matches. No operation
 *     declares a 429 response; no response declares a rate-limit header. This
 *     is the strongest of the four signals, because the document is generated
 *     from the Kajabi application itself rather than hand-maintained — the
 *     repo's README states it "is automatically generated from the main Kajabi
 *     application and should not be edited directly".
 *  2. **Nothing in the prose docs.** The developer site's `introduction` and
 *     `authentication` pages cover the server URL, the token grants and the
 *     Postman collection, and say nothing about limits, throttling or quotas.
 *  3. **No headers on the wire.** `GET https://api.kajabi.com/v1/version`
 *     returned `date`, `content-type`, `content-length`, `x-frame-options`,
 *     `x-xss-protection`, `x-content-type-options`, `x-download-options`,
 *     `x-permitted-cross-domain-policies`, `referrer-policy`, `etag`,
 *     `cache-control`, `x-request-id`, `vary`, `cf-cache-status`, `set-cookie`,
 *     `server: cloudflare`, `cf-ray` — and no `RateLimit-*`, `X-RateLimit-*` or
 *     `Retry-After` among them.
 *  4. **No usage endpoint.** No path in the document matches `usage`, `limit`
 *     or `quota`. There is nothing to read even if a budget exists.
 *
 * ## What is *not* claimed
 *
 * That Kajabi has no limits. It sits behind Cloudflare (`server: cloudflare`,
 * `cf-ray` present on every response), so edge-level protection almost
 * certainly exists; it is simply not published, not surfaced in a header, and
 * not readable by this app. Signal (3) was also observed on an unauthenticated
 * 200 rather than across a sustained authenticated burst — it is evidence that
 * no allowance headers are emitted on the normal path, not proof that no
 * counter exists anywhere.
 *
 * The honest statement is therefore narrower than "there is no quota": there is
 * **no readable remainder**, so there is nothing this check could report that
 * would not be invented.
 *
 * ## Why not count our own calls
 *
 * The same reason the sibling `circle` app rejects it, and more strongly here.
 * Any Kajabi budget would be per-account or per-key, shared with every other
 * integration the creator runs — their Zapier zaps, their own scripts, another
 * w6w connection. Counting only this app's calls yields a number that is
 * correct exclusively for an account using nothing else, and wrong in the
 * optimistic direction otherwise. A confidently wrong headroom figure is worse
 * than a stated absence.
 *
 * ## Severity
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity this declared absence would pin the app at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Kajabi publishes no rate limit, quota or usage endpoint for the Public API. Its " +
      "generated OpenAPI document declares no 429 response and no rate-limit header anywhere " +
      "in 12,530 lines, the developer site's prose covers none, and live responses from " +
      "api.kajabi.com carry no `RateLimit-*`, `X-RateLimit-*` or `Retry-After` header. The API " +
      "is fronted by Cloudflare, so edge protection very likely exists — but no remainder is " +
      "readable, so there is no headroom figure to report that would not be invented.",
  },
};

export default quota;
