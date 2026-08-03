/**
 * How much of the account's hourly API allowance is left?
 *
 * Unlike most apps in this pack, this is a **real reading**, not an
 * `unavailable` note: Docusign returns its rate-limit counters as response
 * headers on ordinary API calls, so headroom can be measured rather than
 * guessed. Verified against the vendor's own reference on 2026-08-03
 * (`developers.docusign.com/platform/resource-limits/` and
 * `docs/esign-rest-api/esign101/rules-and-limits/responses/`):
 *
 * | Header                   | Meaning                                              |
 * | ------------------------ | ---------------------------------------------------- |
 * | `X-RateLimit-Limit`      | Requests per hour from **all** apps on the account. Default 3,000. |
 * | `X-RateLimit-Remaining`  | Requests left in this hour.                          |
 * | `X-RateLimit-Reset`      | Unix epoch seconds when the hourly window resets.     |
 * | `X-BurstLimit-Limit`     | Requests per 30-second burst. 200 in the developer environment, 500 in production. |
 * | `X-BurstLimit-Remaining` | Requests left in this 30-second span.                 |
 *
 * Both buckets are reported, because they fail differently: the hourly one is
 * an allowance you plan against, and the burst one is what a tight polling loop
 * trips within a minute of starting.
 *
 * ## The probe
 *
 * `GET {base_uri}/restapi/v2.1/accounts/{accountId}` — `Accounts: get`, the
 * lightest account-scoped read in the eSignature API. It was chosen over the
 * obvious alternatives deliberately:
 *
 *   - **Not `/envelopes`.** An envelope search needs a `from_date` and returns
 *     a page of data, and Docusign meters envelope GETs separately and more
 *     tightly than ordinary calls — a health check should not compete with the
 *     workflow it is checking on.
 *   - **Not `/oauth/userinfo`.** It lives on the *authentication* host, which
 *     does not carry the eSignature rate-limit headers at all, and it has its
 *     own hourly cap. It is the right probe for credential liveness (that is
 *     exactly what the auth `test` hook uses) and the wrong one for quota.
 *   - **Not `/service_information`.** Unauthenticated, so it reports no
 *     account's allowance.
 *
 * `credential: "signed"` and `scope: "connection"` are the defaults for this
 * kind and are correct here: the counters are per *account*, so the answer
 * genuinely differs between Connections, and reading them requires the
 * credential on the wire.
 *
 * ## The honest caveat
 *
 * Docusign states that "the rate limit headers are not included with all
 * responses", and advises that if a response omits them, the values you most
 * recently received are still valid. This check has no memory across runs, so
 * when the headers are absent it reports `unknown` with a message saying so
 * rather than inventing a number or implying exhaustion.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { accountContext, API_PATH_PREFIX } from "../lib/client.ts";

/** Below this fraction of the hourly allowance, say so. */
const LOW_WATER = 0.1;

function intHeader(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);
  if (raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Reads Docusign's X-RateLimit-* and X-BurstLimit-* response headers from a lightweight account read. Hourly allowance is account-wide across every integration.",
  kind: "quota",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const { baseUri, accountId } = accountContext(ctx.connection);
    const url = `${baseUri}${API_PATH_PREFIX}/accounts/${encodeURIComponent(accountId)}`;

    const res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    await res.body?.cancel();

    // A 429 is itself the answer: the hourly or burst bucket is empty.
    if (res.status === 429) {
      return {
        state: "down",
        message: "Docusign returned 429 — the account's request allowance is exhausted.",
        quota: readQuota(res.headers),
      };
    }
    if (!res.ok) {
      return { state: "unknown", message: `Docusign returned ${res.status} for Accounts: get` };
    }

    const buckets = readQuota(res.headers);
    if (buckets.length === 0) {
      return {
        state: "unknown",
        message:
          "Docusign returned no X-RateLimit-* headers on this response. Its docs note the headers " +
          "are not present on every response; the last values seen remain valid, but this check " +
          "keeps no history.",
      };
    }

    const hourly = buckets.find((b) => b.id === "hourly");
    let state: HealthState = "ok";
    let message: string | undefined;
    if (hourly?.limit && hourly.remaining !== undefined) {
      const fraction = hourly.remaining / hourly.limit;
      if (hourly.remaining === 0) {
        state = "down";
        message = "Hourly API allowance exhausted.";
      } else if (fraction < LOW_WATER) {
        state = "degraded";
        message = `Only ${hourly.remaining} of ${hourly.limit} hourly requests left.`;
      } else {
        message = `${hourly.remaining} of ${hourly.limit} hourly requests left.`;
      }
    }

    return { state, message, quota: buckets, ttlSeconds: 300 };
  },
};

/** Both metered buckets, omitting whichever Docusign did not send. */
function readQuota(headers: Headers): HealthQuota[] {
  const out: HealthQuota[] = [];

  const limit = intHeader(headers, "x-ratelimit-limit");
  const remaining = intHeader(headers, "x-ratelimit-remaining");
  const reset = intHeader(headers, "x-ratelimit-reset");
  if (limit !== undefined || remaining !== undefined) {
    out.push({
      id: "hourly",
      unit: "requests",
      limit,
      remaining,
      // Docusign sends this as Unix epoch seconds.
      resetAt: reset !== undefined ? new Date(reset * 1000).toISOString() : undefined,
    });
  }

  const burstLimit = intHeader(headers, "x-burstlimit-limit");
  const burstRemaining = intHeader(headers, "x-burstlimit-remaining");
  if (burstLimit !== undefined || burstRemaining !== undefined) {
    out.push({
      id: "burst-30s",
      unit: "requests",
      limit: burstLimit,
      remaining: burstRemaining,
    });
  }

  return out;
}

export default quota;
