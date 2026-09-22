import type { AuthDefinition } from "@w6w/types";
import {
  API_BASE,
  API_PREFIX,
  AUTH_ERROR_CODES,
  formatSimpleTextingError,
  parseProblem,
  problemCode,
} from "../lib/client.ts";

/**
 * SimpleTexting personal access token — the whole authentication story for the
 * v2 API.
 *
 * ## `apiKey` in the spec, `Bearer` on the wire
 *
 * `components.securitySchemes.api_key` is declared `type: apiKey, name:
 * Authorization, in: header` — a scheme that would suggest the raw token goes
 * in the header — but its own description, and every code sample in the
 * document, says the opposite:
 *
 * > The client must send this token in the `Authorization: Bearer <token>`
 * > header when making requests to protected resources.
 *
 * Verified live on 2026-09-22 against `GET /v2/api/tenant`:
 *
 * | Sent                                              | Answer |
 * | ------------------------------------------------- | ------ |
 * | no header at all                                  | `401 ERR_AUTH_TOKEN_MISSING` |
 * | `Authorization: not-following-scheme`             | `401 ERR_AUTH_TOKEN_INVALID` |
 * | `Authorization: Bearer <wrong token>`             | `401 ERR_AUTH_TOKEN_INVALID` |
 *
 * The middle row is why the prefix is not optional: a token sent without the
 * scheme fails as an *invalid token*, which reads as "your key is wrong" rather
 * than "your header is wrong". Both `sign` and `test` therefore build the
 * header through {@link authHeaders} — one place, so a probe can never send a
 * header the real requests do not.
 *
 * ## The probe is `GET /api/tenant`, and the body decides
 *
 * Both failure modes are HTTP `401`, so the status alone cannot tell a bad
 * token from an outage — the `errorCode` in the `application/problem+json` body
 * does, and this hook classifies on that and never on the status:
 *
 * - `ERR_AUTH_TOKEN_MISSING` — no token reached the request. The credential did
 *   not survive the connection; reconnect rather than re-mint.
 * - `ERR_AUTH_TOKEN_INVALID` — the token was rejected: "Tenant not found for
 *   provided token".
 * - a `200` with a JSON object — the documented `TenantInfo`, and the only
 *   answer that is `ok`. A `200` whose body is not a JSON object is NOT `ok`:
 *   an endpoint that stops answering its documented shape is not a live
 *   credential check, whatever the status line says.
 * - anything else — `5xx`, a non-JSON body, an unreachable host — says nothing
 *   about the credential, and the message says so.
 *
 * ## The response carries no credential
 *
 * `TenantInfo` is `{email}` — the account's own email address — and nothing
 * else (`components.schemas.TenantInfo`, and confirmed in the live 200 body).
 * There is no token, key or secret field anywhere in it, so the probe cannot
 * echo the credential back into the health surface, and a stored health report
 * cannot leak it either.
 */
export interface SimpleTextingCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `sign` and `test`
 * exercise the same code path — see the module docs for why the `Bearer `
 * prefix is load-bearing rather than cosmetic.
 */
export function authHeaders(credential: Partial<SimpleTextingCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v2/api/tenant`.
 *
 * Chosen, not inherited. It is the cheapest authenticated read in the document
 * (no parameters, no pagination, no resource scope), it is reachable by any
 * token that can call anything at all, and its response is a single email
 * address — see the module docs. Every other candidate was worse: the list
 * endpoints cost a page of real rows, and the three `/report/*` endpoints need
 * no credential at all (`"security": []` in the document), so a probe against
 * one of those would pass with no token attached.
 */
export const PROBE_PATH = "/api/tenant";

/** Parse a `200` body as a JSON object, or return `undefined`. */
function asJsonObject(text: string): Record<string, unknown> | undefined {
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Not JSON.
  }
  return undefined;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Token",
  description:
    "A personal access token from SimpleTexting (Settings > API), sent as `Authorization: Bearer <token>`.",
  connectionLabel: "SimpleTexting",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Token",
      type: "secret",
      required: true,
      hint:
        "Mint one in the SimpleTexting web app under Settings > API. Use a token dedicated to " +
        "this connection so it can be revoked on its own.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns. The token never appears in a URL, so it
   * cannot land in a request log.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<SimpleTextingCredential>;
    for (const [name, value] of Object.entries(authHeaders({ apiKey }))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} and the module docs: the body decides, not the status. */
  async test({ credential }, ctx) {
    const token = ((credential as Partial<SimpleTextingCredential>)?.apiKey ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders({ apiKey: token }) },
      });
    } catch (err) {
      return {
        ok: false,
        message: `could not reach ${API_BASE} to check the token — this is not a statement about ` +
          `the credential: ${String(err)}`,
      };
    }

    const text = await res.text().catch(() => "");
    const code = problemCode(parseProblem(text));

    if (res.ok) {
      const body = asJsonObject(text);
      if (body) return { ok: true };
      return {
        ok: false,
        message: `SimpleTexting answered ${res.status} for ${PROBE_PATH} without a TenantInfo ` +
          "object, so the endpoint no longer proves the token is live",
      };
    }

    if (code === AUTH_ERROR_CODES.missing) {
      return {
        ok: false,
        message:
          `SimpleTexting received no token (${res.status} ${code}). The credential did not reach ` +
          "the request — reconnect this connection.",
      };
    }
    if (code === AUTH_ERROR_CODES.invalid) {
      return {
        ok: false,
        message: `SimpleTexting rejected the token (${res.status} ${code}): ` +
          "Tenant not found for provided token. Check it was copied exactly, that it has not " +
          "been revoked under Settings > API, and that it is sent as a Bearer token.",
      };
    }
    if (res.status === 401) {
      // A 401 whose body is not the documented problem envelope is still a
      // credential statement — the vendor's own status is a hint, and the
      // alternative (calling a rejected token "the API is down") would hide a
      // connection that needs fixing.
      return {
        ok: false,
        message: `SimpleTexting rejected the credential (${res.status}) without a recognised ` +
          `errorCode: ${formatSimpleTextingError(res.status, "GET", PROBE_PATH, text)}`,
      };
    }

    return {
      ok: false,
      message: formatSimpleTextingError(res.status, "GET", PROBE_PATH, text),
    };
  },
};

export default apiKey;
