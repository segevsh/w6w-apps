import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

/**
 * Brandfetch API key — `Authorization: Bearer <key>`, applied in `sign`.
 *
 * Verified 2026-10-06 against the vendor's OpenAPI `securitySchemes` (`bearerAuth`
 * for the Brand, Brand Context, Transaction and Viewer APIs; `clientId`, a `c`
 * query parameter, for Brand Search) and live probes of `api.brandfetch.io`.
 *
 * ## The Brand Search client ID
 *
 * Search is documented as authenticated by a client ID, not the key. It is an
 * optional, non-secret field here, and `sign` adds `c=<clientId>` to requests for
 * `/v2/search/*` only, never to the others. Measured: search also answers 200
 * with no `c`, so a connection without one still works.
 *
 * ## Probe: `GET /v2/viewer`
 *
 * Documented as the way "to verify a credential during integration setup", and
 * free (never consumes credits). Its body is the key's id, name, usage and
 * organization, never the key itself. Three different refusals, none of them
 * the 401 one would guess: no credential is `402` (pay-per-request offer), a
 * malformed header is `401 Unauthorized`, an unknown or revoked key is
 * `403 Forbidden`. The verdict is `res.ok`; the message comes from the body.
 */
export interface BrandfetchCredential {
  apiKey: string;
  clientId?: string;
}

export const VIEWER_PATH = "/v2/viewer";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${VIEWER_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A Brandfetch API key from the developer dashboard (developers.brandfetch.com), " +
    "sent as a bearer token. Optionally add the Brand Search client ID for name searches.",
  connectionLabel: "Brandfetch",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "developers.brandfetch.com > API keys. Used for the Brand, Brand Context and " +
        "Transaction APIs.",
    },
    {
      key: "clientId",
      label: "Brand Search client ID",
      type: "string",
      hint: "Optional. The client ID from developers.brandfetch.com, sent as `c` on name " +
        "searches only. Not secret.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key, clientId } = credential as Partial<BrandfetchCredential>;
    request.headers["authorization"] = `Bearer ${(key ?? "").trim()}`;
    const id = (clientId ?? "").trim();
    if (id) {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/v2/search/")) {
        url.searchParams.set("c", id);
        request.url = url.toString();
      }
    }
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<BrandfetchCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    if (res.ok) return { ok: true };

    const text = errorText(await res.text().catch(() => ""));
    if (res.status === 401 || res.status === 403 || res.status === 402) {
      return {
        ok: false,
        message: `Brandfetch rejected the API key (${res.status}${text ? ` ${text}` : ""}). ` +
          "Check it was copied exactly from developers.brandfetch.com and has not been revoked.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Brandfetch rate-limited the key check (429); try again" };
    }
    return {
      ok: false,
      message: `Brandfetch answered HTTP ${res.status}${
        text ? `: ${text}` : ""
      } for ${VIEWER_PATH}`,
    };
  },
};

export default apiKey;
