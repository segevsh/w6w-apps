import type { HealthCheckDefinition, HealthReport } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Is the Hostaway API **reachable**? — the unsigned probe, for when no credential can be
 * offered.
 *
 * Same endpoint as `api` (`GET /v1/users?limit=1`), called with NO credential: this
 * check declares `credential: "none"`, so the runtime never routes it through `sign`.
 * That is the point — an expired, revoked or not-yet-connected credential must not make
 * a perfectly healthy Hostaway look broken.
 *
 * A reachable Hostaway answers a well-formed JSON body in its own documented "Standard
 * Response" shape, even to an anonymous caller. Verified live 2026-09-22:
 *
 *     GET https://api.hostaway.com/v1/users?limit=1   (no credential)
 *     HTTP/2 403, content-type: application/json
 *     {"status":"fail","message":"The resource owner or authorization server denied the request."}
 *
 * That `status` field — not the 403 — is what proves this is Hostaway's own API answering
 * rather than an edge, proxy or captive portal. Note the live body carried the text in
 * `message` where the docs' "Standard Response" section names `result`, which is why the
 * envelope is accepted with either carrier (see `lib/client.ts#failureMessage`).
 *
 * `severity: "informational"` and "never `down`" are both deliberate:
 *
 *   - This probe cannot prove the API is serving THIS account — only that the API is
 *     there. Declaring it at a stronger severity would let "we cannot prove liveness" be
 *     read as "Hostaway is down", and an `unknown`/`degraded` at any stronger severity
 *     would pin the App's roll-up verdict. `auth:client-credentials` (the derived check)
 *     and `api` (the signed probe) are what speak to liveness.
 *   - An unreachable host is reported as `unknown`, never `down`: at informational
 *     severity a `down` would still be the wrong claim from an unsigned probe, and the
 *     signed `api` check already reports genuine unreachability with the credential in
 *     hand.
 */
const check: HealthCheckDefinition = {
  key: "reachability",
  kind: "dependency",
  scope: "app",
  credential: "none",
  title: "Hostaway API reachable (unsigned)",
  description:
    'Unsigned GET /v1/users?limit=1. A well-formed {"status":"fail",...} envelope proves ' +
    "the API is reachable and speaking Hostaway's own protocol without proving this " +
    "connection's credential is live — so this check is informational and never reports `down`.",
  covers: ["*"],
  severity: "informational",
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
        state: "unknown",
        message: `could not reach ${new URL(API_BASE).host} at all: ${String(err)}`,
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

    const status = (body as { status?: string } | undefined)?.status;
    if (status === "success" || status === "fail") {
      return {
        state: "ok",
        message: `reachable, answering Hostaway's documented status "${status}" envelope ` +
          `(HTTP ${res.status})`,
        latencyMs,
        ttlSeconds: 300,
      };
    }

    return {
      state: "degraded",
      message: `answered HTTP ${res.status} but not with Hostaway's documented status ` +
        `envelope: ${text.trim().slice(0, 200) || "no body"}`,
      latencyMs,
    };
  },
};

export default check;
