import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatBeehiivError } from "../lib/client.ts";

/**
 * beehiiv API key — `Authorization: Bearer <key>`.
 *
 * Verified against beehiiv's own OpenAPI document (`components.securitySchemes`
 * declares a single `BearerAuth: {type: http, scheme: bearer}`) and live probes
 * against `api.beehiiv.com` on 2026-09-29.
 *
 * ## One credential, no scoping
 *
 * Unlike Apify's scoped tokens, beehiiv documents no token scoping mechanism —
 * an API key (from Settings > Integrations > API in beehiiv's dashboard) is a
 * single workspace-wide credential with the same access regardless of which
 * Action calls it. There is no narrower form to prefer.
 *
 * ## beehiiv does not distinguish "no key" from "wrong key"
 *
 * Measured live: a request with no `Authorization` header and one with a
 * syntactically plausible but fake bearer token both answer
 * `401 {"errors":[{"code":"INVALID_API_KEY","message":"The api key is not valid"}]}` —
 * word for word identical. `test` below reports that fact rather than
 * pretending it can tell the two apart.
 */

export interface BeehiivCredential {
  apiKey: string;
}

/** The one place the wire format is built. `test` and `sign` both call this. */
export function authHeaders(credential: Partial<BeehiivCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v2/publications?limit=1`.
 *
 * Chosen because it is the one endpoint every API key can reach regardless of
 * which publications it was issued for — there is no publication-scoped
 * credential to worry about being refused — and its response carries no
 * secret (publication name, org name, stats; see `actions/publication-list.ts`).
 */
export const PROBE_PATH = "/publications";

interface BeehiivErrorBody {
  errors?: Array<{ message?: string; code?: string }>;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from beehiiv > Settings > Integrations > API. The key grants access to " +
    "every publication in the workspace — beehiiv documents no narrower, per-publication form.",
  connectionLabel: "beehiiv",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "beehiiv dashboard > Settings > Integrations > API > Create/Generate API Key.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<BeehiivCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<BeehiivCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(
      `${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`,
      { headers: { accept: "application/json", ...authHeaders({ apiKey: key }) } },
    );
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    const body = (() => {
      try {
        return JSON.parse(raw) as BeehiivErrorBody;
      } catch {
        return null;
      }
    })();
    const code = body?.errors?.[0]?.code;

    if (code === "INVALID_API_KEY") {
      return {
        ok: false,
        message:
          "beehiiv rejected the API key (INVALID_API_KEY). beehiiv reports a missing key and a " +
          "wrong key identically, so reconnect this connection with a key copied fresh from " +
          "beehiiv > Settings > Integrations > API.",
      };
    }
    return {
      ok: false,
      message: formatBeehiivError(res.status, "GET", `${API_PREFIX}${PROBE_PATH}`, raw),
    };
  },

  /**
   * Publish a friendlier label than the bare "beehiiv" default when the
   * workspace has exactly one publication — the common case for an API key
   * scoped to a single newsletter. Silent on any other shape: `test` has
   * already established the key is live, and a missing label must not fail a
   * good Connection.
   *
   * Unsigned here in the same sense as every other hook: `afterConnect` is
   * not handed the raw credential — the runtime routes this `ctx.fetch`
   * through `sign`, the only hook that ever sees it.
   */
  async afterConnect(_input, ctx) {
    try {
      const res = await ctx.fetch(
        `${API_BASE}${API_PREFIX}/publications?limit=2`,
        { headers: { accept: "application/json" } },
      );
      if (!res.ok) return {};
      const body = await res.json() as { data?: Array<{ name?: string; id?: string }> };
      const publications = body?.data ?? [];
      if (publications.length !== 1 || !publications[0]?.name) return {};
      return { publicationName: publications[0].name, publicationId: publications[0].id };
    } catch {
      return {};
    }
  },
};

export default apiKey;
