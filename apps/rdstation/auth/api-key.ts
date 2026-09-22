import type { AuthDefinition } from "@w6w/types";

import { API_BASE, jsonBody } from "../lib/client.ts";

/**
 * RD Station CRM authentication — a per-user static token in the query string.
 *
 * ## The credential
 *
 * The CRM v1 OpenAPI document declares exactly one scheme
 * (`securitySchemes.Token`): `{"type": "apiKey", "name": "token", "in":
 * "query"}`. There is no OAuth flow, no refresh and no scopes — a CRM user
 * generates a token in the product itself (Configurações → Integrações →
 * Tokens) and pastes it here. It is immutable once generated, so a rotated
 * token means a new Connection, not a refresh.
 *
 * `sign` is the only place in this app the credential exists: it appends
 * `token=…` to the outbound request's query string and returns the request. It
 * runs in a network-less worker, so it cannot leak the token anywhere even if it
 * wanted to.
 *
 * ## The probe
 *
 * `GET /token/check` is the vendor's own liveness endpoint — the one thing the
 * OpenAPI reference says returns `{"email", "name", "organization"}` for a live
 * token. It needs no visibility level, and it **never echoes the token**: the
 * response carries the account's identity, not the credential, which is what
 * makes it a legal probe.
 *
 * `test` runs UNSIGNED (the `sign` hook is not applied to it), so it builds its
 * own authenticated URL by hand. Validity is read from the **body**, never the
 * status code alone — a 200 without the documented `email` field is not a live
 * token just because it answered 200 — and neither the token nor any part of it
 * is ever put in the result message.
 */
export const TOKEN_CHECK_PATH = "/token/check";

/**
 * Classify a `GET /token/check` response from its body.
 *
 * The success shape is the vendor's `{"email", "name", "organization"}`; every
 * failure path is described in the reference as the conventional
 * `{"error": "Permission denied."}` with a 401. Anything else — a 200 with no
 * `email`, an HTML body from an intermediary — is reported as unconfirmed
 * rather than guessed at in either direction.
 */
export function classifyTokenCheck(
  status: number,
  body: unknown,
): { ok: boolean; message?: string } {
  const record = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  if (status < 400 && typeof record.email === "string" && record.email.trim().length > 0) {
    return { ok: true };
  }

  const detail = typeof record.error === "string" && record.error.trim()
    ? record.error.trim()
    : undefined;

  if (status === 401) {
    return {
      ok: false,
      message: `RD Station CRM refused the token: ${detail ?? "Permission denied."}`,
    };
  }
  if (status >= 400) {
    return {
      ok: false,
      message: `RD Station CRM answered ${status}${detail ? `: ${detail}` : ""}`,
    };
  }
  return {
    ok: false,
    message:
      "RD Station CRM answered without the documented `email` field, so the token could not be " +
      "confirmed live",
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Token",
  description:
    "Connect with an RD Station CRM token. Each user generates their own in the CRM under " +
    "Configurações → Integrações → Tokens; there is no OAuth flow for this API.",
  apiKey: { in: "query", name: "token" },
  fields: [
    {
      key: "apiKey",
      label: "Token",
      type: "secret",
      required: true,
      hint: "RD Station CRM → Configurações → Integrações → Tokens (per-user, immutable).",
    },
  ],

  /**
   * Append `token=<apiKey>` to the request's query string.
   *
   * `new URL` rather than string surgery, so an existing query string (every
   * list action's filters) survives untouched.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    const url = new URL(request.url);
    url.searchParams.set("token", apiKey);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: token } = credential as { apiKey?: string };
    if (typeof token !== "string" || token.length === 0) {
      return {
        ok: false,
        message: "No token was supplied — enter the token generated in RD Station CRM.",
      };
    }

    const url = new URL(`${API_BASE}${TOKEN_CHECK_PATH}`);
    url.searchParams.set("token", token);

    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    return classifyTokenCheck(res.status, await jsonBody(res));
  },
};

export default apiKey;
