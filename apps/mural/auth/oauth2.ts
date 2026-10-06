import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorParts } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization-code flow - the only auth Mural's public API declares
 * (its OpenAPI has exactly one security scheme, `oauth2`, `flows.authorizationCode`).
 * Read 2026-10-06 from `developers.mural.co/public/reference/*.md`:
 *
 *  - authorize `GET {API_BASE}/authorization/oauth2`
 *  - token and refresh both `POST {API_BASE}/authorization/oauth2/token`
 *  - ten scopes; this app's actions need the ones listed below.
 *
 * Mural access tokens expire: a call answers `{"code":"TOKEN_EXPIRED","message":
 * "Your token has expired. You need to refresh your OAuth token."}`, so the host's
 * `refresh` handling is part of the contract, not an extra. PKCE is not mentioned
 * by the reference and is left off.
 *
 * ## The probe
 *
 * `GET /users/me` (scope `identity:read`) returns the caller's own profile - id,
 * name, email - never the token. An unsigned call was measured on 2026-10-06 to
 * answer 401 `{"code":"UNAUTHORIZED","message":"You don't have the required
 * permissions to access this endpoint."}`. The verdict is classified from the
 * body's `code`, not the bare status: `UNAUTHORIZED` / `TOKEN_EXPIRED` mean the
 * credential is no good; any other error is reported with its code.
 */
export const PROBE_PATH = "/users/me";

const REJECTED = new Set(["UNAUTHORIZED", "TOKEN_EXPIRED"]);

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth 2.0 (Connect Mural)",
  description: "Authorization-code flow. Register an app at https://app.mural.co/developers/apps " +
    "and enter its client ID and secret; the redirect URI must match the host's callback.",
  connectionLabel: "{{user.name}}",
  oauth2: {
    authorizationUrl: `${API_BASE}/authorization/oauth2`,
    tokenUrl: `${API_BASE}/authorization/oauth2/token`,
    refreshUrl: `${API_BASE}/authorization/oauth2/token`,
    scopes: [
      "identity:read",
      "workspaces:read",
      "rooms:read",
      "rooms:write",
      "murals:read",
      "murals:write",
      "users:read",
    ],
    scopeSeparator: " ",
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.ok) return { ok: true };
    const { code, message } = errorParts(await res.json().catch(() => null));
    if (code && REJECTED.has(code)) {
      return {
        ok: false,
        message: `Mural rejected the token (${code}). Reconnect Mural to authorize again.`,
      };
    }
    return {
      ok: false,
      message: `Mural returned HTTP ${res.status} for ${PROBE_PATH}` +
        `${code ? ` ${code}` : ""}${message ? `: ${message}` : ""}`,
    };
  },

  /** `identity:read` is granted with the connection, so the profile gives it a label. */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      value?: { firstName?: string; lastName?: string };
    };
    const name = [body.value?.firstName, body.value?.lastName].filter(Boolean).join(" ");
    return name ? { user: { name } } : {};
  },
};

export default oauth2;
