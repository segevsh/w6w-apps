import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, vendorError } from "../lib/client.ts";

/**
 * Printful private token — `Authorization: Bearer <token>`, applied in `sign`.
 *
 * Verified 2026-10-06 against developers.printful.com/docs (OAuth security scheme: "`access_token`
 * and `token_type` must be included in the request `Authorization` header", example
 * `Authorization: Bearer smk_…`) and live probes. A private token created at
 * developers.printful.com/login > Tokens is sent exactly like an OAuth access token.
 *
 * An **account-level** token covers every store, so store-scoped calls also need
 * `X-PF-Store-Id` ("required only for account level token"); a store-level token needs none.
 * The optional Store ID field is stamped on by `sign`. It is NOT sent to `/stores`, the one
 * route the reference documents without that header.
 *
 * ## Probe: `GET /stores`
 *
 * Returns the stores the token can see (`id`, `name`, `type`), never the token. Measured:
 * no header answers HTTP 401 `{"code":401,"error":{"reason":"Unauthorized","message":"This
 * endpoint requires Oauth authentication!"}}` and a bogus bearer answers HTTP 401 with
 * message "The access token provided is invalid." Both are read from the body `error.reason`,
 * not from the status.
 */
export interface PrintfulCredential {
  accessToken: string;
  storeId?: string;
}

export const PROBE_PATH = "/stores";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${PROBE_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Private Token",
  description: "A Printful private token (developers.printful.com > Tokens), sent as " +
    "`Authorization: Bearer …`. Add a Store ID when the token is account-level.",
  connectionLabel: "Printful ({{store}})",
  fields: [
    {
      key: "accessToken",
      label: "Private token",
      type: "secret",
      required: true,
      hint: "developers.printful.com > your app/token > Create token. Shown once.",
    },
    {
      key: "storeId",
      label: "Store ID",
      type: "string",
      required: false,
      hint: "Only for an account-level token: the numeric store id from List Stores. " +
        "Leave empty for a store-level token.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken, storeId } = credential as Partial<PrintfulCredential>;
    request.headers["authorization"] = `Bearer ${(accessToken ?? "").trim()}`;
    const store = (storeId ?? "").toString().trim();
    if (store && !new URL(request.url).pathname.startsWith("/stores")) {
      request.headers["x-pf-store-id"] = store;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken: token } = credential as Partial<PrintfulCredential>;
    if (!(token ?? "").trim()) {
      return { ok: false, message: "credential missing the private token" };
    }

    const request = await accessToken.sign!({ request: probeRequest(), credential }, ctx);
    let res: Response;
    try {
      res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    } catch (e) {
      return { ok: false, message: `could not reach the Printful API: ${e}` };
    }
    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }
    const err = vendorError(body);

    if (res.ok) {
      return Array.isArray((body as { result?: unknown } | undefined)?.result)
        ? { ok: true }
        : { ok: false, message: `unexpected ${res.status} body from GET /stores — no store list` };
    }
    if (err?.reason === "Unauthorized") {
      return {
        ok: false,
        message: `Printful rejected the token (${err.message ?? "Unauthorized"}). Create a ` +
          "private token at developers.printful.com.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Printful rate-limited the token check (429); try again" };
    }
    if (res.status >= 500) {
      return { ok: false, message: `Printful is erroring (HTTP ${res.status})` };
    }
    return {
      ok: false,
      message: `Printful answered HTTP ${res.status}${
        err ? ` (${[err.reason, err.message].filter(Boolean).join(": ")})` : ""
      } for ${PROBE_PATH}`,
    };
  },

  /** Records the first store's name for the connection label. */
  async afterConnect({ credential }, ctx) {
    let store = "Printful";
    try {
      const request = await accessToken.sign!({ request: probeRequest(), credential }, ctx);
      const res = await ctx.fetch(request.url, {
        method: request.method,
        headers: request.headers,
      });
      if (res.ok) {
        const body = await res.json() as { result?: Array<{ name?: string }> };
        store = body.result?.[0]?.name || store;
      }
    } catch { /* the label falls back to "Printful" */ }
    return { store };
  },
};

export default accessToken;
