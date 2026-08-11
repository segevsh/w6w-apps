/**
 * How much Splitwise quota is left? — a declared absence.
 *
 * Splitwise rate-limits, says so, and publishes nothing you can read. Its
 * reference devotes a whole section to the subject and every sentence of it is
 * qualitative:
 *
 * > The Splitwise API is rate-limited to protect the stability of our service
 * > for all users. Rate limits vary by endpoint and resource, and are subject
 * > to change at any time without notice. If you make too many requests in a
 * > short period, the API will respond with an `HTTP 429 Too Many Requests`
 * > status code.
 *
 * No number, no bucket, no window, no reset. And nothing on the wire either:
 * the full response header set of a live `GET /api/v3.0/get_current_user` was
 * captured on 2026-08-11 and carries **no `X-RateLimit-*`, no `RateLimit-*`, no
 * `Retry-After`** — only `date`, `content-type`, `content-length`,
 * `cache-control`, `content-disposition`, the Heroku NEL/report-to trio,
 * `referrer-policy`, `server`, `strict-transport-security`, `vary`, `via`, the
 * four `x-` security headers, `x-request-id`, `x-runtime` and Cloudflare's
 * `cf-cache-status` / `cf-ray`.
 *
 * There is consequently nothing to probe and nothing to fold into a reading. A
 * check that reported "quota: unknown" every minute would be noise dressed as
 * data; this says the same thing once, as a fact.
 *
 * `severity: "informational"` is load-bearing, not decoration. An `unavailable`
 * entry always reports `unknown`, and `unknown` outranks `ok` in the roll-up —
 * so at any other severity, stating "Splitwise publishes no quota surface"
 * would pin this app's health verdict at `unknown` permanently.
 *
 * The only signal that exists is the 429 itself, which arrives as a request
 * failure rather than a measurement. `lib/client.ts` recognises it and says
 * plainly that Splitwise publishes no headers to back off against, so a caller
 * is told to use a delay rather than sent looking for a `Retry-After` that is
 * not there.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  scope: "connection",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: 'Splitwise documents its rate limits only as "vary by endpoint and resource, and are ' +
      'subject to change at any time without notice", publishes no numeric limit, and returns ' +
      "no X-RateLimit-*, RateLimit-* or Retry-After header on any response (measured on the " +
      "live 401 from GET /api/v3.0/get_current_user, 2026-08-11). The only observable is the " +
      "429 itself, which surfaces as a request failure rather than as headroom.",
  },
};

export default quota;
