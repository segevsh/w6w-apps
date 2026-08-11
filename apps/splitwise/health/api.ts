/**
 * Is the Splitwise API answering, and is `v3.0` still mounted?
 *
 * The status page has an `API` component (`health/service.ts`), which makes
 * this look redundant. It is not: that component is Splitwise's own
 * hand-updated judgement about its API as a whole, and it reports at human
 * speed. This asks the narrower, mechanical question that no status page
 * answers — *is the `/api/v3.0` router still there and still serving JSON right
 * now* — which is the failure mode a version withdrawal produces and which a
 * status page would never call an incident.
 *
 * ## A 401 is the PASS
 *
 * The probe carries no credential, so Splitwise rejects it. Measured live on
 * 2026-08-11:
 *
 *     GET https://secure.splitwise.com/api/v3.0/get_current_user
 *     HTTP/2 401 · application/json; charset=utf-8 · 54 bytes
 *     {"error":"Invalid API Request: you are not logged in"}
 *
 * That is the strongest available evidence of health: DNS resolved, TLS
 * terminated, Cloudflare passed the request through, the Rails app routed it to
 * the v3.0 API controller, and the authentication filter ran. Judging this
 * check by the HTTP status would report Splitwise as permanently down.
 *
 * The verdict is taken from the **status plus the body shape**, and the
 * alternatives are informative rather than uniform, because Splitwise serves
 * its API and its marketing site from one origin:
 *
 *   - **404 with an HTML body** — measured for `/api/v1.0/…`, `/api/v2.0/…`,
 *     `/api/v3.1/…` and for a nonsense path, all 3,085 bytes and byte-identical
 *     (md5 `e7b1bed2c96c…`). If `v3.0` ever answers this, the version this app
 *     is written against has been withdrawn and every action is dead: `down`.
 *   - **404 with a JSON body** — `/api/v4.0/…` answers
 *     `{"errors":[{"status":"404","title":"Not Found"}]}` for *every* path
 *     including nonsense ones, so a routed-but-empty API namespace exists. Same
 *     conclusion for v3.0, reported separately because the distinction is what
 *     tells you a rewrite happened rather than a route being dropped.
 *   - **200** — the whoami stopped requiring a credential. That is not health;
 *     it is an anomaly worth surfacing, so it reports `degraded` and says what
 *     it saw.
 *   - **5xx** — `down`. **429** — `degraded`: rate-limited is alive.
 *
 * ## Annotation
 *
 *  - `kind: "dependency"` — a different question from "is the vendor up"
 *    (`service`) and "is this key live" (the derived `auth:*` check).
 *  - `scope: "app"` — one shared host, no per-tenant subdomain, so the answer is
 *    the same for every Connection.
 *  - `credential: "none"` — `sign` must not run. A probe that spends the very
 *    credential it monitors is a bad trade at any interval, and an unsigned
 *    request cannot be metered against anyone's account.
 *  - **No `network.allow`** — `secure.splitwise.com` is already the app's own
 *    egress host; there is nothing to widen.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

export const API_PROBE_URL = `${API_BASE}${API_PREFIX}${PROBE_PATH}`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unsigned GET of /api/v3.0/get_current_user. A JSON 401 is the pass — it proves the v3.0 " +
    "router is mounted and the auth filter ran. An HTML 404 means the version was withdrawn.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(API_PROBE_URL, { headers: { accept: "application/json" } });
    const contentType = res.headers.get("content-type") ?? "";
    const isJson = /\bjson\b/i.test(contentType);
    const body = await res.text().catch(() => "");

    if (res.status === 401) {
      // The documented, measured shape: a JSON object with a string `error`.
      let parsed: { error?: unknown } | null = null;
      try {
        parsed = JSON.parse(body) as { error?: unknown };
      } catch { /* handled below */ }
      if (isJson && typeof parsed?.error === "string") {
        return { state: "ok", message: "v3.0 answered its documented JSON 401", ttlSeconds: 60 };
      }
      return {
        state: "degraded",
        message: `401 but not the documented JSON body (content-type: ${contentType || "none"})`,
        ttlSeconds: 60,
      };
    }

    if (res.status === 404) {
      return {
        state: "down",
        message: isJson
          ? "v3.0 answered a JSON 404 — the namespace routes but the endpoint is gone"
          : "v3.0 answered the site's HTML 404 — the API version has been withdrawn",
        ttlSeconds: 60,
      };
    }

    if (res.status === 429) {
      return { state: "degraded", message: "Splitwise rate-limited the probe (429)" };
    }

    if (res.status >= 500) {
      return { state: "down", message: `Splitwise returned ${res.status}` };
    }

    if (res.ok) {
      return {
        state: "degraded",
        message: "an unauthenticated whoami returned " + res.status +
          " — get_current_user has stopped requiring a credential, which this app's auth probe " +
          "depends on",
      };
    }

    return { state: "unknown", message: `Splitwise returned an unexpected ${res.status}` };
  },
};

export default api;
