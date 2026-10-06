import type { AuthDefinition } from "@w6w/types";
import { API_URL, AUTH_ERRORS, errorParts } from "../lib/client.ts";

/**
 * OnePageCRM API key, carried as HTTP Basic: `user_id` is the username, `api_key` the password
 * (OpenAPI `securitySchemes.BasicAuth` = `{type: http, scheme: basic}`; the developer portal:
 * "your username is your user_id and your password is your api_key", both on
 * https://app.onepagecrm.com/app/api).
 *
 * OAuth 2.1 exists but is by request only (closed beta, client registration by the vendor), so it
 * is deliberately not modelled.
 *
 * ## The probe, and the one endpoint NOT to use
 *
 * `test` calls `GET /users` — the account's team list (names, emails, roles; unpaginated). It does
 * not echo the credential. `GET /bootstrap` looks like the natural whoami but its response
 * carries `auth_key`, the caller's own API key, so it is never used as a check or label source.
 *
 * ## Classifying a rejection
 *
 * Verified live 2026-10-06: a syntactically valid user id with a wrong key answers HTTP **401**
 * whose body says `"status":400,"error_name":"invalid_login"`; a malformed id answers 401 with
 * `authorization_data_not_found`. The body's `status` disagrees with the HTTP status, so the
 * verdict comes from `error_name`, and the HTTP status alone never decides.
 */
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** The one place the wire format is built (shared by `sign`, `test` and `afterConnect`). */
export function basicHeader(userId: string, apiKey: string): string {
  return `Basic ${encodeBase64(`${userId}:${apiKey}`)}`;
}

interface Cred {
  userId?: string;
  apiKey?: string;
}

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "User ID & API Key",
  description:
    "From OnePageCRM → Settings → API (app.onepagecrm.com/app/api), Configuration tab. Sent as " +
    "HTTP Basic: the User ID is the username, the API Key the password.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  fields: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      row: "creds",
      hint: "Shown on the API page of your OnePageCRM account.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Shown beside the User ID. It grants the full access of that user.",
    },
  ],

  sign({ request, credential }) {
    const { userId, apiKey } = credential as { userId: string; apiKey: string };
    request.headers["authorization"] = basicHeader(userId, apiKey);
    return request;
  },

  async test({ credential }, ctx) {
    const { userId, apiKey } = credential as Cred;
    if (!userId || !apiKey) return { ok: false, message: "credential missing userId or apiKey" };

    const res = await ctx.fetch(`${API_URL}/users`, {
      headers: { accept: "application/json", authorization: basicHeader(userId, apiKey) },
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    const { name, message } = errorParts(body);
    if (name !== undefined) {
      if (AUTH_ERRORS.has(name)) {
        return { ok: false, message: `OnePageCRM rejected the credential (${name})` };
      }
      return { ok: false, message: `OnePageCRM error ${name}${message ? `: ${message}` : ""}` };
    }
    // Only the documented shape is a pass: `data` is the array of `{user: …}` records.
    const data = (body as { data?: unknown } | null)?.data;
    if (res.ok && Array.isArray(data)) return { ok: true };
    return {
      ok: false,
      message: `OnePageCRM /users did not return the documented shape (HTTP ${res.status})`,
    };
  },

  /** Labels the Connection from the matching `/users` record (the caller's own user id). */
  async afterConnect({ credential }, ctx) {
    const { userId, apiKey } = credential as Cred;
    if (!userId || !apiKey) return {};
    const res = await ctx.fetch(`${API_URL}/users`, {
      headers: { accept: "application/json", authorization: basicHeader(userId, apiKey) },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as
      | { data?: Array<{ user?: Record<string, string> }> }
      | null;
    const users = Array.isArray(body?.data) ? body!.data! : [];
    const me = users.map((u) => u.user).find((u) => u?.id === userId);
    if (!me) return {};
    return {
      user: {
        id: me.id,
        email: me.email,
        name: [me.first_name, me.last_name].filter(Boolean).join(" ") || undefined,
      },
    };
  },
};

export default basic;
