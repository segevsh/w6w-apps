import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Paperform API key — `Authorization: Bearer <key>`.
 *
 * Verified against Paperform's own "Getting Started" reference page
 * (`paperform.readme.io/reference/getting-started-1`, fetched 2026-09-29, which carries the
 * literal sentence "Your API key needs to be sent with every request in the authorization
 * header") and live probes against `api.paperform.co` the same day.
 *
 * ## API access is plan-gated, not just key-gated
 *
 * Paperform's own docs: "API access is only available with either the Standard or Business
 * API for Paperform." A syntactically valid key on a lower plan is rejected the same way a
 * bad key is — Paperform does not expose a distinct error for "your plan doesn't include
 * this" versus "this key is wrong" on {@link PROBE_PATH}, so `test`'s failure message
 * mentions the plan requirement as a possibility rather than asserting the key itself is bad.
 *
 * ## No missing-vs-wrong distinction, and no whoami
 *
 * Measured live on 2026-09-29: a request with **no** `Authorization` header and one with a
 * syntactically-plausible but fake bearer token both answer the **identical**
 * `401 {"status":"error","error_type":"authentication","message":"Could not authenticate",
 * "details":["Please pass a valid API Key in the Bearer header"]}` — so `test` below does not
 * try to tell them apart, the same finding this pack's `cloudconvert` app documents for its
 * own vendor. Paperform's OpenAPI document also names no `/me`/`/account`-shaped endpoint at
 * all, so there is nothing for `afterConnect` to read — this app declares none, rather than
 * inventing a probe that doesn't exist.
 */

export interface PaperformCredential {
  apiKey: string;
}

/** The one place the wire format is built — `sign` and `test` reuse it. */
export function authHeaders(credential: Partial<PaperformCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v1/forms?limit=1`.
 *
 * Paperform documents no scoped-key mechanism (unlike CloudConvert's six independent
 * scopes) and no `/me`/account-info endpoint at all, so this app's own read surface —
 * listing forms, the one operation nearly every action here depends on transitively — is
 * the narrowest real probe available. `limit=1` keeps it cheap; Paperform does not
 * rate-limit reads any differently from other requests (the 60/minute ceiling in
 * `health/request-rate.ts` is a flat, endpoint-agnostic budget), so this costs one request
 * against that shared budget, same as any other call.
 */
export const PROBE_PATH = "/forms";

/** Paperform's stable machine error code for an authentication failure. */
export const AUTHENTICATION_ERROR_TYPE = "authentication";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from Paperform Account > Developer. API access requires the Standard or " +
    "Business plan.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "paperform.co/account/developer — generate a new API key. API access requires the " +
        "Standard or Business plan; some actions (updating forms/fields, webhooks, spaces) " +
        "additionally require Business.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<PaperformCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint, and its documented limits. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<PaperformCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(
      `${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`,
      { headers: { accept: "application/json", ...authHeaders({ apiKey: key }) } },
    );
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error_type?: string; message?: string; details?: string[] }
      | null;
    const errorType = body?.error_type;

    if (errorType === AUTHENTICATION_ERROR_TYPE || res.status === 401) {
      return {
        ok: false,
        message: "Paperform rejected the API key (401 authentication). Paperform does not " +
          "distinguish a missing key from a wrong one in this response, so check it was copied " +
          "exactly from Account > Developer, has not been revoked, and that the account is on " +
          "the Standard or Business plan (API access requires one of those).",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Paperform refused GET /v1/forms (403${errorType ? ` ${errorType}` : ""}). ` +
          "This usually means API access is not enabled on the account's plan.",
      };
    }
    return {
      ok: false,
      message: `Paperform returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.message ? `: ${body.message}` : ""
      }`,
    };
  },
};

export default apiKey;
