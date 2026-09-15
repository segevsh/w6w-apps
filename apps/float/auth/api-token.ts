import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, USER_AGENT } from "../lib/client.ts";

/**
 * Float API token — `Authorization: Bearer <token>`.
 *
 * Verified against `developer.float.com/overview_authentication.html` and
 * live probes against `api.float.com`, both on 2026-09-15.
 *
 * ## One token, company-wide
 *
 * Unlike Apify or many other vendors, Float's docs describe no scoped-token
 * concept: "The access token returned will grant access to Float API
 * resources on behalf of a specific user – in this case, the account owner –
 * suitable for machine-to-machine communication." There is one token per
 * Float account (minted from Float Account Settings), and it is not
 * per-connection restrictable, so there is no "correctly scoped but refused"
 * case to design the probe around the way Apify's is.
 *
 * ## The probe is `GET /v3/departments`, not `GET /v3/accounts`
 *
 * Both are cheap, unauthenticated-nothing reads that prove the token is live.
 * `departments` was chosen over `accounts` because an Account record carries a
 * real person's name and email address (`Account.name`/`Account.email`) —
 * there is no reason for a connectivity probe's stored result to carry a
 * teammate's PII when a `department` (just an id and a name like
 * "Engineers") proves exactly the same thing.
 *
 * ## Two response shapes for "not authorized", and only one is JSON
 *
 * Measured live on 2026-09-15: a request that carries NO `Authorization`
 * header at all never reaches Float's own API — an edge/WAF layer in front
 * of Kong answers with a bare `403 Forbidden`, `text/html`, no body worth
 * reading. The moment an `Authorization: Bearer …` header is present, even
 * holding a nonsense value, the request reaches Float's gateway and gets
 * Float's real JSON error: `{"name":"Unauthorized","message":"Your request
 * was made with invalid credentials.","code":0,"status":401}`. `sign` always
 * attaches the header, so a *connected* credential only ever hits the second
 * case — but `test` still checks `content-type` before calling `res.json()`,
 * because a blank or whitespace-only stored token reproduces the first case.
 */

export interface FloatCredential {
  apiToken: string;
}

/** The one place the wire format is built, shared with `test`. */
export function authHeaders(credential: Partial<FloatCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/** See the module doc for why departments, not accounts. */
export const PROBE_PATH = "/departments";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste the API token from Float > Team Settings > Integrations. This token grants access on " +
    "behalf of the account owner and is not scoped per-connection.",
  connectionLabel: "Float",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Float > Team Settings > Integrations > API. Treat it like a password — anyone " +
        "holding it can act as the account owner.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: stamps and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<FloatCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<FloatCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?per-page=1`, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
        ...authHeaders({ apiToken: token }),
      },
    });
    if (res.ok) return { ok: true };

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("json")) {
      // The edge/WAF refusal — no Authorization header reached Float at all.
      return {
        ok: false,
        message:
          `Float refused the request before it reached the API (HTTP ${res.status}, no JSON ` +
          "body). The credential did not reach the request — reconnect this connection.",
      };
    }

    const body = await res.json().catch(() => null) as
      | { name?: string; message?: string; status?: number }
      | null;

    if (res.status === 401) {
      return {
        ok: false,
        message:
          `Float rejected the token (401${body?.name ? ` ${body.name}` : ""}${
            body?.message ? `: ${body.message}` : ""
          }). Check it was copied exactly from Float > Team Settings > Integrations and has not ` +
          "been regenerated.",
      };
    }
    return {
      ok: false,
      message: `Float returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.message ? `: ${body.message}` : ""
      }`,
    };
  },
};

export default apiToken;
