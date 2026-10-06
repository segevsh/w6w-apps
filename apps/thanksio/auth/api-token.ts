import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorMessage } from "../lib/client.ts";

/**
 * thanks.io personal access token — `Authorization: Bearer <token>`.
 *
 * Verified against https://docs.thanks.io/api-reference/openapi.json (`securitySchemes.bearerAuth`,
 * http/bearer) and live probes against `api.thanks.io` on 2026-10-06. thanks.io also offers
 * OAuth2; this app uses only the token a user creates under Dashboard > API Access.
 *
 * ## Credential probe: `GET /mailing-lists/?items_per_page=1`
 *
 * The probe is chosen by measuring which endpoints actually require the credential:
 *
 *   | Endpoint                     | no token | bogus token |
 *   | ---------------------------- | -------- | ----------- |
 *   | `/mailing-lists/`            | 401      | 401         |
 *   | `/orders/list`, `/webhooks`  | 401      | 401         |
 *   | `/handwriting-styles`        | **200**  | **200**     |
 *   | `/giftcard-brands-list`      | **200**  | **200**     |
 *
 * `/handwriting-styles` and `/giftcard-brands(-list)` are PUBLIC: a Connection whose token never
 * reached the request would pass a probe against them. The rejection body is
 * `{"message":"Unauthenticated."}` — not the `Unauthorized` / 403 the OpenAPI documents — so the
 * verdict is classified from the body, and success is the documented `data` array rather than
 * a bare HTTP 200. The listing returns mailing-list metadata only, never the credential.
 */
export interface ThanksioCredential {
  apiToken: string;
}

export const PROBE_PATH = "/mailing-lists/?items_per_page=1";

export function authHeaders(credential: Partial<ThanksioCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description: "A thanks.io personal access token from Dashboard > API Access. Sent as " +
    "`Authorization: Bearer`.",
  connectionLabel: "thanks.io",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "thanks.io Dashboard > API Access. Turn on API Testing Mode for the account while " +
        "building: it cancels the orders the API places, so a test run does not mail anything.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<ThanksioCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<ThanksioCredential>)?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    const body = await res.json().catch(() => null) as
      | { data?: unknown; message?: string }
      | null;

    if (res.ok && Array.isArray(body?.data)) return { ok: true };

    const message = errorMessage(body);
    if (
      res.status === 401 || res.status === 403 ||
      /unauthenticated|unauthorized/i.test(message ?? "")
    ) {
      return {
        ok: false,
        message: `thanks.io rejected the API token (HTTP ${res.status}${
          message ? ` — ${message}` : ""
        }). Check it was copied exactly from Dashboard > API Access and has not been regenerated.`,
      };
    }
    if (res.status === 402) {
      return {
        ok: false,
        message: "thanks.io has temporarily disabled API access for this account after repeated " +
          "payment failures (HTTP 402). Fix billing in the thanks.io dashboard.",
      };
    }
    return {
      ok: false,
      message: `thanks.io returned an unexpected response (HTTP ${res.status})${
        message ? `: ${message}` : ""
      }`,
    };
  },
};

export default apiToken;
