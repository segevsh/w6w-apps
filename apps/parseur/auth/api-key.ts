import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Parseur API key — `Authorization: <key>`.
 *
 * Verified against `developer.parseur.com/authentication.md` (fetched
 * 2026-09-15) and live probes against `api.parseur.com` the same day.
 *
 * ## No prefix — this is deliberate, see `lib/client.ts`
 *
 * The OpenAPI document's own `securitySchemes.TokenAuth.description` says to
 * send `Authorization: Token YOUR_API_KEY`. The current authentication guide
 * explicitly supersedes that: the `Token ` prefix "still works" but "is not
 * required any longer", and shows every example sending the bare key. This
 * app follows the current guide.
 *
 * ## The probe is the API root, exactly as the vendor's own docs recommend
 *
 * `authentication.md` names `GET /` as "the quickest smoke test" for a key,
 * and documents its success body: `{"document": "...", "parser": "..."}` — a
 * fixed routing map, not account data, so nothing about the probe response
 * needs redacting.
 *
 * Confirmed live on 2026-09-15:
 *
 *   | Request                                   | Status | Body                                            |
 *   | ------------------------------------------ | ------ | ------------------------------------------------ |
 *   | No `Authorization` header                  | 403    | `{"non_field_errors":"Not authenticated"}`        |
 *   | `Authorization: <garbage>`                  | 403    | `{"non_field_errors":"Authentication failed"}`    |
 *
 * Both arrive as HTTP 403 (Parseur never uses 401 for this), and the vendor
 * distinguishes "no credential reached the request" from "a credential
 * arrived but was rejected" only in the body — never by status code alone —
 * which is why `test` reads `non_field_errors` rather than trusting the 403.
 *
 * ## No `afterConnect` — there is nothing to fetch
 *
 * A Parseur API key is account-wide, and the whole documented surface has no
 * `/account`, `/me` or `/whoami` operation of any kind (the `Account` schema
 * exists in the OpenAPI document but is not referenced by any path). There is
 * no live call this app could make to learn the account's name or email to
 * label the Connection with, so none is attempted.
 */

export interface ParseurCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `sign` and `test` never drift apart. */
export function authHeaders(credential: Partial<ParseurCredential>): Record<string, string> {
  return { authorization: credential.apiKey ?? "" };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Parseur > Account > API keys. The key is account-wide — it authorizes " +
    "every mailbox, document and template this account owns.",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Parseur app > Account (top-right menu) > API keys (app.parseur.com/account/api-keys).",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<ParseurCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See the module docs for why `GET /` and why the body, not the status, decides the message. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ParseurCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { non_field_errors?: string } | null;
    const reason = body?.non_field_errors;

    if (reason === "Not authenticated") {
      return {
        ok: false,
        message:
          "Parseur received no key. The credential did not reach the request — reconnect this " +
          "connection.",
      };
    }
    if (reason === "Authentication failed" || res.status === 403) {
      return {
        ok: false,
        message: `Parseur rejected the key (${res.status}${reason ? `: ${reason}` : ""}). Check ` +
          "it was copied exactly from Account > API keys and has not been revoked.",
      };
    }
    return { ok: false, message: `Parseur returned HTTP ${res.status} for GET /` };
  },
};

export default apiKey;
