import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, errorText, vendorErrors } from "../lib/client.ts";

/**
 * Personal auth token — the `auth_token` query parameter, applied in `sign`.
 *
 * Verified 2026-10-06 against https://api.beeminder.com/ ("The parameter name for your personal
 * auth token should be `auth_token`" — and a common mistake is calling it `access_token`, which
 * is the OAuth client token). The token is read at beeminder.com/api/v1/auth_token.json while
 * logged in. That endpoint echoes the token, so it is NOT used as a probe.
 *
 * ## Probe: `GET /users/me.json`
 *
 * Returns `{username, timezone, updated_at, goals: [slugs]}` — no credential material, no
 * quota cost. (The docs promise the `me` macro for OAuth access tokens; that it also resolves a
 * personal token could not be proved without a live token, so `username` is overridable on every
 * action.) Rejections were measured live and read from the body: a missing token is
 * `401 {"errors":{"token":"no_token",…}}`, a wrong one
 * `401 {"errors":{"auth_token":"bad_token","message":"No such auth_token found. …"}}`.
 */
export interface BeeminderCredential {
  authToken: string;
}

export const PROBE_PATH = "/users/me.json";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${PROBE_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const authToken: AuthDefinition = {
  key: "auth-token",
  type: "apiKey",
  displayName: "Personal Auth Token",
  description: "Your personal Beeminder auth token (beeminder.com/api/v1/auth_token.json while " +
    "logged in), sent as the `auth_token` query parameter.",
  connectionLabel: "Beeminder",
  apiKey: { in: "query", name: "auth_token" },
  fields: [
    {
      key: "authToken",
      label: "Auth Token",
      type: "secret",
      required: true,
      hint: "Log in to Beeminder, then open beeminder.com/api/v1/auth_token.json.",
    },
  ],

  sign({ request, credential }) {
    const { authToken } = credential as Partial<BeeminderCredential>;
    const url = new URL(request.url);
    url.searchParams.set("auth_token", (authToken ?? "").trim());
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { authToken: token } = credential as Partial<BeeminderCredential>;
    if (!(token ?? "").trim()) return { ok: false, message: "credential missing the auth token" };

    const request = await authToken.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }

    if (res.ok && vendorErrors(body) === undefined) return { ok: true };
    if (res.status === 401) {
      return {
        ok: false,
        message: "Beeminder rejected the auth token (401). Copy it again from " +
          "beeminder.com/api/v1/auth_token.json — it is the personal token, not an OAuth " +
          "`access_token`.",
      };
    }
    const text = errorText(vendorErrors(body));
    return {
      ok: false,
      message: `Beeminder answered HTTP ${res.status}${text ? `: ${text}` : ""} for ${PROBE_PATH}`,
    };
  },
};

export default authToken;
