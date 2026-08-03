/**
 * Is this Connection's Metabase up, and is its application database behind it?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. For a self-hosted Metabase there is
 *     no vendor platform to be up or down: the instance IS the dependency, and
 *     its availability is a property of the customer's own infrastructure. The
 *     `service` check covers Metabase Cloud separately, and is informational
 *     precisely because it says nothing about this instance.
 *   - `scope: "connection"` — every Connection carries its own `siteUrl`
 *     (a Cloud subdomain, or a private origin), so there is no shareable
 *     app-wide answer to cache.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH host to call and needs no credential to
 *     interpret the answer, so `sign` must not run. `/api/health` is
 *     unauthenticated by design; sending an API key to it would be gratuitous
 *     exposure.
 *   - No `network.allow`: the instance is already reachable under the App's own
 *     `["*"]` allowlist, and a `context` check is unsigned regardless.
 *   - `severity` stays at the `degraded` default for this kind. The derived
 *     `auth:api-key` check already covers a credential that has stopped working,
 *     so this one is the advisory half of the pair.
 *
 * ## Why `GET /api/health`, and why not the two obvious alternatives
 *
 * Metabase mounts three probes, and only one of them is worth having. From
 * `src/metabase/server/routes.clj`:
 *
 *     ;; ^/api/health -> Health Check Endpoint
 *     (GET "/api/health" [] health-handler)
 *     ;; ^/readyz -> Readiness probe (same implementation as /api/health)
 *     (GET "/readyz" [] health-handler)
 *     ;; ^/livez -> Liveness probe (no DB access)
 *     (GET "/livez" [] livez-handler)
 *
 * and `health-handler` in the same file is explicit about what it means:
 *
 *     (if (init-status/complete?)
 *       (if (or (mdb/recent-activity?)
 *               (mdb/can-connect-to-data-source? (mdb/data-source)))
 *         {:status 200, :body {:status "ok"}}
 *         {:status 503, :body {:status "Unable to get app-db connection"}})
 *       {:status 503, :body {:status "initializing",
 *                            :progress (init-status/progress)}})
 *
 * **`/livez` is the trap.** Its own docstring says it "does not perform any
 * database checks" and it "Always returns 200 with the same body format as
 * `/api/health` when healthy" — `livez-handler` is literally
 * `{:status 200, :body {:status "ok"}}` with no conditions. A Metabase whose
 * application database has gone away answers `/livez` with a cheerful
 * `{"status":"ok"}` while being unable to run a single query. Picking the probe
 * by name — "liveness, that sounds like what I want" — would produce a check
 * that can never fail, which is worse than no check at all. It is *identical* in
 * shape to the `apps/grist` finding, inverted: there the richer probe was the
 * one that lied, here it is the poorer one.
 *
 * **`/readyz` is the same handler**, so it is neither better nor worse — but it
 * lives at the root, outside `/api`, where a reverse proxy in front of Metabase
 * is far more likely to have rewritten or blocked it. `/api/health` sits with
 * every other route this app calls, so if it is reachable the rest are too.
 *
 * **`/api/health-inspector` is richer and unusable.** It returns a list of
 * detected problems (verified: `200 []` on a healthy instance) but it is
 * authenticated and admin-scoped — verified: `401 Unauthenticated` with no
 * credential. A `context` check has no credential by construction, and using a
 * `signed` one would report every correctly-scoped non-admin key as an outage.
 *
 * ## Verified on the wire, 2026-08-03, against v0.63.2.7
 *
 *   | Path                    | Status | Body                                |
 *   | ----------------------- | ------ | ----------------------------------- |
 *   | `/api/health`           | 200    | `{"status":"ok"}`                   |
 *   | `/api/health` (booting) | **503** | `{"status":"initializing","progress":…}` |
 *   | `/readyz`               | 200    | `{"status":"ok"}`                   |
 *   | `/livez`                | 200    | `{"status":"ok"}` — unconditionally |
 *   | `/api/health-inspector` | 401    | `Unauthenticated` (plain text)      |
 *   | `/api/notreal-zzz`      | 404    | `"API endpoint does not exist."`    |
 *
 * The last two rows are the ones that make this a real handler rather than a
 * 200-everything catch-all: a sibling nonsense path under the same `/api` prefix
 * is refused with a distinct 404 body, and a real sibling refuses to answer at
 * all without a credential. The 503 row was captured by restarting the container
 * and polling during boot, which proves the failure branch is reachable and not
 * merely written down.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { normalizeSiteUrl } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Metabase instance reachable",
  description:
    "Unauthenticated `GET /api/health` against this connection's Metabase — proves the host " +
    "resolves, Metabase is serving, and its application database answers. Deliberately not " +
    "`/livez`, which returns 200 unconditionally and cannot report a broken instance.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { siteUrl?: string };
    if (!display.siteUrl) return { state: "unknown", message: "connection records no site URL" };

    let base: string;
    try {
      base = normalizeSiteUrl(display.siteUrl);
    } catch (err) {
      return { state: "unknown", message: (err as Error).message };
    }

    // A transport failure is caught here rather than left to propagate, and the
    // distinction is the whole point of this check.
    //
    // The runtime wraps a throwing hook as `{state: "unknown", message: "probe
    // failed: …"}` (`runtime/src/health.ts`). That is the right default for a
    // check whose subject is elsewhere — a status API that will not answer says
    // nothing about the vendor. It is the WRONG answer here: connection refused,
    // DNS failure and a TLS error against this connection's own host are not
    // "we could not find out", they are the single most common way for a
    // Metabase to be down, and reporting them as `unknown` would make the check
    // silent in exactly the case it exists for.
    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/health`, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "down",
        message: `cannot reach ${new URL(base).host}: ${(err as Error).message}`,
        ttlSeconds: 60,
      };
    }

    const body = await res.json().catch(() => null) as
      | { status?: string; progress?: number }
      | null;

    if (res.status === 503) {
      // Metabase's two 503 bodies mean different things, and conflating them
      // would page someone at 3am for a rolling restart. `initializing` is a
      // container that has not finished booting — transient by construction, and
      // it carries a progress fraction worth showing. Anything else is the
      // app-db branch, which is a real outage.
      if (body?.status === "initializing") {
        const pct = typeof body.progress === "number"
          ? ` (${Math.round(body.progress * 100)}%)`
          : "";
        return {
          state: "degraded",
          message: `Metabase is still starting up${pct}`,
          ttlSeconds: 30,
        };
      }
      return {
        state: "down",
        message: body?.status ?? "Metabase cannot reach its application database",
        ttlSeconds: 120,
      };
    }
    if (res.status >= 500) {
      return { state: "down", message: `instance returned ${res.status}`, ttlSeconds: 120 };
    }
    if (res.status === 404) {
      return {
        state: "down",
        message: "no Metabase at this URL — /api/health is not routed",
        ttlSeconds: 120,
      };
    }
    if (!res.ok) {
      // 401/403 here means something in front of Metabase is gating an endpoint
      // Metabase itself leaves open — an SSO proxy, a WAF, basic auth. The
      // instance may be perfectly healthy; this check simply cannot see it.
      return {
        state: "unknown",
        message: `/api/health returned ${res.status} — something in front of Metabase is gating it`,
        ttlSeconds: 120,
      };
    }

    // A 200 whose body is not Metabase's health payload means something else is
    // answering on this origin: a parked page, a proxy error page, a captive
    // portal. Reachable, but not this Metabase.
    if (body?.status !== "ok") {
      return {
        state: "degraded",
        message: "host answered but did not return Metabase's health payload",
        ttlSeconds: 120,
      };
    }

    return { state: "ok", ttlSeconds: 120 };
  },
};

export default instance;
