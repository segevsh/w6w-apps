import type { HealthCheckDefinition, HealthQuota, HealthReport } from "@w6w/types";
import { API_BASE, failureMessage } from "../lib/client.ts";

/**
 * Is the Hostaway API answering **for this account**? — the signed probe.
 *
 * `GET /v1/users?limit=1` with the Connection's bearer token (the runtime injects it via
 * the auth `sign` hook; this module never sees or sets the header). That endpoint is:
 *
 *   - lightweight and account-scoped, so a 200 proves both that the API is up AND that
 *     this credential is accepted by a real business endpoint — not just by the token
 *     endpoint every account can reach;
 *   - safe to run unattended, and it does NOT echo the credential back. (The docs'
 *     documented User object carries `id`, `accountId`, `email`, `firstName`, … — no
 *     token material — which is why this probe was chosen over a `/me`- or
 *     `/apikey`-shaped endpoint.)
 *
 * Classification follows the vendor's own discriminator, NEVER the HTTP status alone:
 * the docs' "Standard Response" section defines `status: "success" | "fail"`, and a body
 * carrying `status: "fail"` is a failure even when it arrives with a 200. The reverse
 * holds too — Hostaway answers 403 with a well-formed `{"status":"fail",...}` envelope
 * (verified live on an unsigned request), so a 403 whose body is NOT that envelope is a
 * different thing (an edge or proxy) and is reported as such.
 *
 * Quota: when instead of a success the API answers 429, its `X-RateLimit-*` headers are
 * the only headroom signal Hostaway publishes — the docs state those headers "appear on
 * 429 responses only" and add that `X-RateLimit-Retry-After` is "a Unix timestamp in
 * seconds, not a delay". A `limit`/`remaining`/`resetAt` reading is attached to the
 * report when present, rather than a number being invented for the client.
 */
const check: HealthCheckDefinition = {
  key: "api",
  kind: "dependency",
  scope: "connection",
  credential: "signed",
  title: "Hostaway API answering for this account",
  description:
    "Signed GET /v1/users?limit=1, classified from Hostaway's own `status` envelope rather " +
    "than the HTTP status code. Reports X-RateLimit-* headroom when a 429 carries it.",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 300,

  async check(_input, ctx): Promise<HealthReport> {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/users?limit=1`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach ${new URL(API_BASE).host}: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const text = await res.text().catch(() => "");
    let body: unknown;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = undefined;
      }
    }

    // A 429 is the one case where the headers carry anything extra, and the documented
    // 429 body is itself a `status: "fail"` envelope — so this is read first, while the
    // verdict below still comes from the body.
    if (res.status === 429) {
      const quota = quotaFromHeaders(res.headers);
      const detail = failureMessage(body) ?? (text.trim().slice(0, 200) || "no body");
      return {
        state: "degraded",
        message: `rate limited (HTTP 429): ${detail} — ${quotaNote(res.headers)}`,
        quota: quota ? [quota] : undefined,
        latencyMs,
      };
    }

    // The vendor's own discriminator, from the response body.
    const status = (body as { status?: string } | undefined)?.status;
    if (status === "success") {
      return {
        state: "ok",
        message: res.ok ? undefined : `Hostaway reported success with HTTP ${res.status}`,
        latencyMs,
        ttlSeconds: 300,
      };
    }
    if (status === "fail") {
      return {
        state: "degraded",
        message: `Hostaway answered status "fail": ${failureMessage(body)}`,
        latencyMs,
      };
    }

    // No envelope at all: fall back to the transport, and never call it "ok".
    if (res.status >= 500) {
      return {
        state: "down",
        message: `Hostaway returned HTTP ${res.status} without its documented envelope`,
        latencyMs,
      };
    }
    return {
      state: "degraded",
      message: `unexpected response (HTTP ${res.status}): ${
        text.trim().slice(0, 200) || "no body"
      }`,
      latencyMs,
    };
  },
};

/** The 429 headers, as documented: limit, remaining, a retry-at timestamp and which limiter. */
function quotaFromHeaders(headers: Headers): HealthQuota | undefined {
  const limit = Number(headers.get("x-ratelimit-limit") ?? "");
  const remaining = Number(headers.get("x-ratelimit-remaining") ?? "");
  if (!Number.isFinite(limit) && !Number.isFinite(remaining)) return undefined;
  const retryAfter = Number(headers.get("x-ratelimit-retry-after") ?? "");
  const applied = headers.get("x-ratelimit-applied") ?? undefined;
  return {
    id: applied,
    ...(Number.isFinite(limit) ? { limit } : {}),
    ...(Number.isFinite(remaining) ? { remaining } : {}),
    // Documented as a Unix timestamp in SECONDS to retry AT — not a delay.
    ...(Number.isFinite(retryAfter) && retryAfter > 0
      ? { resetAt: new Date(retryAfter * 1000).toISOString() }
      : {}),
    unit: "requests",
  };
}

function quotaNote(headers: Headers): string {
  const applied = headers.get("x-ratelimit-applied");
  const retryAfter = headers.get("x-ratelimit-retry-after");
  const parts = [
    applied ? `${applied} limit` : "limit",
    retryAfter ? `retry after ${retryAfter}` : "no retry-after header",
  ];
  return parts.join(", ");
}

export default check;
