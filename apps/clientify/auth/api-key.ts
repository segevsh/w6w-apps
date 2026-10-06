import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

/**
 * Clientify API key — `Authorization: Token <key>`.
 *
 * The key is the account's API token (Clientify settings; the same value
 * `POST /v1/api-auth/obtain_token/` returns for a username and password, which this app
 * does not call so no password is ever collected).
 *
 * ## The probe: `GET /v1/users/`
 *
 * It lists the account's users (username, name, country, phone, picture) — never the token —
 * so unlike Mailjet's `/apikey` it cannot echo the credential. The verdict comes from the
 * response BODY:
 *
 *  - a `results` array (or a bare array)  -> valid;
 *  - `{"detail":"Invalid token."}`         -> the key is wrong (measured as HTTP 401);
 *  - `{"detail":"Api key not provided."}`  -> no key reached the request (measured as HTTP
 *    **404**, not 401 — which is why the status code alone is never trusted here).
 */

export interface ClientifyCredential {
  apiKey: string;
}

export function authHeaders(credential: Partial<ClientifyCredential>): Record<string, string> {
  return { authorization: `Token ${credential.apiKey ?? ""}` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste the API key from your Clientify account settings.",
  apiKey: { in: "header", name: "Authorization", prefix: "Token " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Clientify account settings, API section. Sent as `Authorization: Token <key>`.",
    },
  ],

  sign({ request, credential }) {
    const cred = credential as Partial<ClientifyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<ClientifyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/v1/users/`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* non-JSON */ }

    const isList = Array.isArray(body) ||
      (!!body && typeof body === "object" &&
        Array.isArray((body as { results?: unknown }).results));
    if (res.ok && isList) return { ok: true };

    const detail = errorText(body);
    if (detail && /invalid token/i.test(detail)) {
      return {
        ok: false,
        message: "Clientify rejected the API key (Invalid token). Copy it again from your " +
          "Clientify account settings; it may have been regenerated.",
      };
    }
    if (detail && /not provided/i.test(detail)) {
      return { ok: false, message: `Clientify did not receive an API key: ${detail}` };
    }
    return {
      ok: false,
      message: `Unexpected response from Clientify (HTTP ${res.status})${
        detail ? `: ${detail}` : ""
      } — the key could not be verified.`,
    };
  },
};

export default apiKey;
