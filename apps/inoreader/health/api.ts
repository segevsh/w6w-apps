/**
 * Is the Inoreader API answering?
 *
 * The status page is HTML-only (see `service.ts`), so reachability of the API host is the one
 * out-of-band signal there is.
 *
 *   - `credential: "none"` — `sign` must not run, so this spends nobody's quota and cannot
 *     leak a token. An unsigned call is metered against nothing.
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, identical for every Connection.
 *
 * **A schema-correct auth refusal is a PASS.** An unsigned `GET /reader/api/0/user-info`
 * answers `403` with the plain-text body `AppId required! Contact app developer.` (measured
 * 2026-10-06), and a call with an unknown bearer token answers `401` with
 * `OAuth token not found or invalid.`. Either proves DNS, TLS, Cloudflare and Inoreader's own
 * auth layer ran. The verdict is taken from the BODY — a 403 or 401 whose text is one of those
 * vendor messages. A 403 carrying anything else (a Cloudflare challenge page) is `unknown`,
 * not a pass: it says nothing about the API.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const REFUSAL_PATTERN = /AppId required|OAuth token not found/i;

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET https://www.inoreader.com/reader/api/0/user-info. A 403 'AppId " +
    "required' (or a 401 'OAuth token not found') proves the API and its auth layer are " +
    "answering. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/user-info`, {
      headers: { accept: "application/json" },
    });
    const text = (await res.text()).trim();

    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    const isHtml = /^<(!doctype|html)/i.test(text);
    if ((res.status === 403 || res.status === 401) && !isHtml && REFUSAL_PATTERN.test(text)) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    if (res.ok) {
      // An unsigned 200 is not a documented answer to this call.
      return { state: "unknown", message: "unsigned /user-info answered 200 — unexpected" };
    }
    return {
      state: "unknown",
      message: `HTTP ${res.status} with a body that is not Inoreader's auth refusal`,
    };
  },
};

export default api;
