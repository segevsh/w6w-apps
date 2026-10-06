import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, baseHeaders, errorText } from "../lib/client.ts";

/**
 * Axonaut user API key — `userApiKey: <key>` request header.
 *
 * The OpenAPI document declares one security scheme, `userApiKey` (`type: apiKey`,
 * `in: header`), applied to every operation. Nothing else (no OAuth, no query form) is
 * documented, so nothing else is offered.
 *
 * ## The probe is `GET /api/v2/languages`
 *
 * `GET /api/v2/me` is the obvious whoami and is NOT used: its documented response schema
 * includes a `user_api_key` field, i.e. it returns the caller's own key. `/languages` needs no
 * id, no query and no `page` header, and answers a bare array of strings. `test` keeps only a
 * boolean; the body is never stored.
 *
 * ## The status is not the verdict
 *
 * Measured 2026-10-06: no header answers `400 {"error":{"message":"Bad request - Missing header
 * : \"userApiKey\"","status_code":"400"}}` and a wrong key answers `403 Forbidden access`. The
 * vendor's documented statuses are a hint only: a pass is a 2xx whose body is a JSON array;
 * a failure is classified from the `error.message` body.
 */

export interface AxonautCredential {
  apiKey: string;
}

export const PROBE_PATH = `${API_PREFIX}/languages`;

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<AxonautCredential>): Record<string, string> {
  return { userapikey: (credential.apiKey ?? "").trim() };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste your Axonaut user API key (Axonaut > Settings > Integrations > API). The " +
    "key acts as its owner, so a workflow can do exactly what that user can.",
  connectionLabel: "Axonaut",
  apiKey: { in: "header", name: "userApiKey" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Your personal Axonaut API key. Use a dedicated user for automation if you can: " +
        "the key carries that user's rights.",
    },
  ],

  /** The only hook handed the raw credential; network-less, it stamps the header. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<AxonautCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<AxonautCredential>;
    if (!(cred?.apiKey ?? "").trim()) return { ok: false, message: "credential missing apiKey" };

    // `sign` only auto-applies to action traffic, so the header is built by hand here.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { ...baseHeaders(), ...authHeaders(cred) },
    });
    const body = await res.json().catch(() => null) as unknown;

    if (res.ok) {
      if (Array.isArray(body)) return { ok: true };
      return {
        ok: false,
        message: `Axonaut answered ${res.status} but not with the documented list of languages.`,
      };
    }
    const msg = errorText(body);
    if (res.status === 429) {
      return {
        ok: false,
        message: "Axonaut rate-limited the check (429); the key was not judged. Retry shortly.",
      };
    }
    if (res.status === 403 || res.status === 401 || res.status === 400) {
      return {
        ok: false,
        message: `Axonaut refused the key (${res.status}${msg ? ` ${msg}` : ""}). Check the key ` +
          "was copied exactly and has not been regenerated in Axonaut.",
      };
    }
    return { ok: false, message: `Axonaut returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default apiKey;
