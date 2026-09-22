import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, truncate } from "../lib/client.ts";
import { classifyAuthAnswer, PROBE_PATH } from "../auth/api-key.ts";

/**
 * Is HeyReach answering at all? — asked on the app's own API host, with the
 * connection's key.
 *
 * ## Only one endpoint exists to ask
 *
 * HeyReach publishes no status API and no dedicated ping, so the probe is the
 * same documented operation the auth `test` hook uses,
 * `GET /api/public/auth/CheckApiKey` — on the API host the app already talks
 * to, so no extra hostname enters `network.allow` and no third-party status
 * host ever sees a credential.
 *
 * ## The verdict comes from the response BODY, never the status code
 *
 * Live-verified 2026-09-22: an unsigned and a wrongly-signed request both
 * answer **HTTP 401**, distinguishable only by body text (`Missing API key` vs
 * `Invalid API key`). So a check that asked "was it 200?" would report an
 * outage for a perfectly reachable API the moment a key was wrong — and, when
 * signed with a *correct* key, would report "up" for any 2xx at all, including
 * one coming from something that is not HeyReach.
 *
 * The classification is delegated to {@link classifyAuthAnswer}, the same
 * function `auth/api-key.ts` uses, so the credential probe and the
 * reachability probe can never disagree about what one wire response means:
 *
 *   - **`200`** → `ok`: the API accepted the key.
 *   - **`401` reading `Missing API key` / `Invalid API key`** → `ok` **for
 *     reachability**: HeyReach read the request and answered with its own
 *     schema-correct auth error, which is proof the host resolves, TLS
 *     completes and the API is serving. Whether the credential is any good is
 *     a different question with a different fix, and it is answered by the
 *     derived `auth:api-key` check (projected from `../auth/api-key.ts`'s
 *     `test` hook), which reports a rejected key on its own. Conflating the two
 *     is how "the key was rotated" gets misreported as "HeyReach is down".
 *   - **`429`** → `degraded`: the API is up and throttling this workspace.
 *   - **`5xx` / connection refused / timeout** → `down`.
 *   - **anything else** (a 404 on the documented path, HTML where JSON should
 *     be, a 2xx with no JSON body at all) → `degraded`/`unknown` with the raw
 *     status and the first bytes of the body, never a guess in either
 *     direction. `unknown` here is a transient "I cannot read this answer", not
 *     a permanent one: the documented happy path is a 200, so the check is not
 *     pinned at `unknown` by design.
 *
 * ## Why this one is signed, and why that makes it connection-scoped
 *
 * The probe carries the connection's key, so the runtime runs it once per
 * Connection and injects the credential through `sign`. That is deliberate:
 * HeyReach is single-tenant-per-key with one host, so the credential is the only
 * thing that varies, and a signed probe is what lets the check report the
 * vendor's own answer about *this* account rather than an unauthenticated
 * smoke test that any string would pass.
 */
const api: HealthCheckDefinition = {
  key: "api",
  kind: "service",
  scope: "connection",
  credential: "signed",
  title: "HeyReach API reachable",
  description:
    "Calls GET /api/public/auth/CheckApiKey with this connection's key and reads the API's own " +
    "auth answer. A 401 carrying `Missing API key`/`Invalid API key` is proof HeyReach is " +
    "reachable — the credential itself is the derived auth:api-key check's verdict.",
  covers: ["*"],
  severity: "fatal",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach ${API_BASE}: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const text = await res.text().catch(() => "");
    const answer = classifyAuthAnswer(res.status, text);

    switch (answer) {
      case "accepted":
        return {
          state: "ok",
          message: `${API_BASE} accepted this connection's key`,
          latencyMs,
        };
      case "key-rejected":
      case "key-missing":
        return {
          state: "ok",
          message: `${API_BASE} answered ${res.status} "${truncate(text.trim(), 80)}" — the ` +
            `vendor is reachable (that is HeyReach's own auth answer, exactly as documented), ` +
            `but this connection's credential is the problem. The derived auth:api-key check ` +
            `reports it; reconnect the connection to fix it.`,
          latencyMs,
        };
      case "rate-limited":
        return {
          state: "degraded",
          message: `${API_BASE} answered 429 — reachable, but this key is being rate-limited`,
          latencyMs,
        };
      default:
        break;
    }

    if (res.status >= 500) {
      return {
        state: "down",
        message: `HeyReach answered ${res.status} to its own auth endpoint`,
        latencyMs,
      };
    }
    if (res.status === 404) {
      return {
        state: "degraded",
        message: `${API_BASE} answered 404 for ${PROBE_PATH} — the host is serving and the ` +
          "documented path is not, which usually means this app's path prefix is wrong rather " +
          "than that HeyReach is down",
        latencyMs,
      };
    }
    if (/<html/i.test(text)) {
      return {
        state: "degraded",
        message: `something answered for ${API_BASE} with HTML — most likely a proxy or an SPA ` +
          "shell rather than the API",
        latencyMs,
      };
    }
    return {
      state: "unknown",
      message:
        `HeyReach answered ${res.status}${
          text.trim() ? ` with ${truncate(text.trim(), 160)}` : " with no body"
        }, which is neither its 200 nor a 401 carrying \`Missing API key\`/\`Invalid API key\` — ` +
        "not classifiable",
      latencyMs,
    };
  },
};

export default api;
