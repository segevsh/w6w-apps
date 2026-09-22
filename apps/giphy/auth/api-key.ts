import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, API_PREFIX, type GiphyEnvelope } from "../lib/client.ts";

/**
 * GIPHY API key — a required query-string parameter, `api_key`.
 *
 * Verified on 2026-09-22 against GIPHY's own documentation
 * (`developers.giphy.com/docs/api/` and `/endpoint/`) and live probes against
 * `api.giphy.com` on the same day.
 *
 * ## There is no header form
 *
 * Every GIPHY endpoint documents `api_key : string(required)` as a query-string
 * parameter, and none documents an `Authorization` header or any other way to
 * present the key. So this method is `type: "apiKey"` with
 * `apiKey: { in: "query", name: "api_key" }`, and {@link sign} is the only place
 * a request learns the key.
 *
 * ## Merging, not concatenating
 *
 * `sign` parses `request.url` with `URL` and sets the parameter through
 * `URLSearchParams`. Appending `"?api_key=…"` by hand would double the `?` on
 * every action that already sends a query — which is most of them — and would
 * silently clobber or duplicate an existing parameter. Setting through
 * `searchParams` merges with whatever the action built and overwrites rather
 * than repeats, which is why the probe below reuses this exact hook instead of
 * assembling its own URL.
 *
 * ## The status is in the body, so that is what `test` reads
 *
 * GIPHY's envelope carries `meta.status`/`meta.msg`, and a live probe with a
 * deliberately invalid key answered HTTP 401 with
 * `{"data": [], "meta": {"status": 401, "msg": "Unauthorized", "response_id": ""}}`.
 * {@link PROBE_PATH} therefore classifies on `meta.status === 200` and reports
 * `meta.msg` on failure — never on `Response.ok`, and never by comparing or
 * echoing the key material, which is the one thing a credential probe must not
 * do.
 */

export interface GiphyCredential {
  apiKey: string;
}

/**
 * The credential-liveness probe: `GET /v1/gifs/trending?limit=1`.
 *
 * Chosen for being the cheapest documented call on the whole surface — it is
 * the only endpoint family that needs no other parameter at all, and `limit=1`
 * asks for the smallest possible response. It proves the same thing every
 * action needs proved (GIPHY accepts this key and answers 200) without
 * consuming a search, and it returns no account data, because GIPHY documents
 * no account or "who am I" endpoint for an `api_key`.
 */
export const PROBE_PATH = "/gifs/trending";

/** The one query parameter the probe adds; `limit` is documented on this endpoint. */
export const PROBE_QUERY: Record<string, string> = { limit: "1" };

/**
 * A signable GET request, built the way the actions build theirs.
 *
 * Exported so `test` exercises the same URL construction as every action and
 * `sign` signs the same object shape the host hands it — a hand-rolled second
 * copy of either half is how a probe ends up testing something the real
 * requests never do.
 */
export function probeRequest(): SignableRequest {
  const url = new URL(`${API_BASE}${API_PREFIX}${PROBE_PATH}`);
  for (const [k, v] of Object.entries(PROBE_QUERY)) url.searchParams.set(k, v);
  return {
    url: url.toString(),
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A GIPHY API key from developers.giphy.com/dashboard. GIPHY has no header-based auth, so the " +
    "key is merged into each request's query string as `api_key` by this connection. Every key " +
    "starts as a beta key, capped at 100 calls/hour.",
  connectionLabel: "GIPHY",
  apiKey: { in: "query", name: "api_key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "developers.giphy.com/dashboard → Create an App → use its API key. New keys are beta " +
        "keys, capped at 100 calls/hour until GIPHY grants a production key.",
    },
  ],

  /**
   * The only hook that touches the credential.
   *
   * Network-less by construction: it rewrites the outbound request in place and
   * returns. The key goes into the query string because GIPHY accepts nothing
   * else, and `URLSearchParams` merges it with any parameters the action
   * already set.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<GiphyCredential>;
    const url = new URL(request.url);
    url.searchParams.set("api_key", (apiKey ?? "").trim());
    request.url = url.toString();
    return request;
  },

  /**
   * A real call, classified by GIPHY's own `meta.status`.
   *
   * The request is built and signed through {@link probeRequest} and this same
   * method's `sign` hook, so what runs here is what runs on a workflow step.
   * The failure messages name GIPHY's code and message and never the key.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<GiphyCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    // Signed by this method's own hook: the probe cannot drift from the real
    // requests, because it is built by the same code.
    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);

    const res = await ctx.fetch(request.url, {
      method: request.method,
      headers: request.headers,
    });
    const body = await res.json().catch(() => null) as GiphyEnvelope | null;

    // The body is the vendor's answer; `res.status` is only quoted when the
    // body carries no readable `meta.status` at all.
    const status = body?.meta?.status;
    const msg = body?.meta?.msg;

    if (status === 200) return { ok: true };
    if (status === 401) {
      return {
        ok: false,
        message: `GIPHY rejected the API key (401${msg ? ` ${msg}` : ""}). Check it was copied ` +
          "exactly from developers.giphy.com/dashboard and has not been deleted.",
      };
    }
    if (status === 429) {
      return {
        ok: false,
        message: `GIPHY rate-limited this key (429${msg ? ` ${msg}` : ""}). Beta keys are capped ` +
          "at 100 calls/hour.",
      };
    }
    if (status !== undefined) {
      return { ok: false, message: `GIPHY answered ${status}${msg ? ` ${msg}` : ""}` };
    }
    return {
      ok: false,
      message: `GIPHY answered HTTP ${res.status} without a readable status in its body`,
    };
  },
};

export default apiKey;
