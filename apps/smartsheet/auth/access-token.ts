import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Smartsheet API access token, carried as `Authorization: Bearer <token>`.
 *
 * ## What the wire format is, and where that is stated
 *
 * Smartsheet's OpenAPI document declares two security schemes and no global
 * `security` requirement. The one this method implements is:
 *
 *     "APIToken": { "type": "http", "scheme": "bearer", "description": "API Token." }
 *
 * `GET /users/me` additionally declares an explicit `Authorization` header
 * parameter described as "API Access Token used to authenticate requests to
 * Smartsheet APIs."
 *
 * Verified live on 2026-08-03:
 *
 *   - `GET https://api.smartsheet.com/2.0/users/me` with **no** header →
 *     `403 { "errorCode": 1004, "message": "You are not authorized to perform this action." }`
 *   - the same call with `Authorization: Bearer bogus` →
 *     `401 { "errorCode": 1002, "message": "Your Access Token is invalid." }`
 *
 * So the header is genuinely read, and a bad token is distinguishable from an
 * absent one — which is what the `test` hook below relies on.
 *
 * Generate one at **Smartsheet → Account → Personal Settings → API Access →
 * Generate new access token**. Note the API is restricted to Business and
 * Enterprise plans: the spec's own preamble says "The Smartsheet API is
 * restricted to users on Business and Enterprise plans", so a token from a lower
 * plan will fail here through no fault of this app.
 *
 * ## OAuth 2.0 also exists, and is deliberately not shipped
 *
 * The same document declares an authorization-code flow:
 *
 *   - `authorizationUrl`: `https://app.smartsheet.com/b/authorize`
 *   - `tokenUrl`: `https://api.smartsheet.com/2.0/token`
 *   - 17 scopes, including `READ_SHEETS`, `WRITE_SHEETS`, `ADMIN_SHEETS`,
 *     `CREATE_SHEETS`, `DELETE_SHEETS`, `READ_USERS`, `ADMIN_USERS`,
 *     `ADMIN_WORKSPACES`, `READ_EVENTS`, `ADMIN_WEBHOOKS`.
 *
 * We ship the access token because it needs no app registration, no redirect URI
 * and no client secret, and because it carries the full permissions of the user
 * who minted it — so no action in this app can fail for want of a scope the
 * connect flow forgot to ask for. OAuth is the right choice for a multi-org
 * listed integration; add it as a second `AuthDefinition` with the config above
 * when that is needed. It is not stubbed here, because a half-wired OAuth method
 * is worse than an absent one.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "API Access Token",
  description:
    "Paste an API access token from Smartsheet → Account → Personal Settings → API Access. Sent " +
    "as `Authorization: Bearer <token>`. Requires a Business or Enterprise plan.",
  connectionLabel: "{{user.email}}",
  fields: [
    {
      key: "accessToken",
      label: "API Access Token",
      type: "secret",
      required: true,
      hint: "Smartsheet → Account → Personal Settings → API Access → Generate new access token. " +
        "The token carries the permissions of the user who minted it, and is shown once.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it stamps
   * the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const { accessToken: token } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /users/me` — Smartsheet's whoami, and the call its own getting-started
   * guide uses to demonstrate a working token.
   *
   * It is the right liveness probe because it needs no sheet, no workspace and
   * no admin right: every token can read its own user. Probing a resource
   * listing instead (say `GET /sheets`) would report a working credential as
   * broken for a user who happens to own nothing, and `GET /users` would report
   * it broken for anyone who is not a system admin.
   */
  async test({ credential }, ctx) {
    const { accessToken: token } = credential as { accessToken?: string };
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    if (res.ok) return { ok: true };

    // 1002 "Your Access Token is invalid." is the token-specific answer; 1004
    // "You are not authorized to perform this action." is what an absent header
    // gets. Both are surfaced verbatim — Smartsheet's messages are better than
    // anything this hook could invent.
    const body = await res.text().catch(() => "");
    let message: string | undefined;
    try {
      message = (JSON.parse(body) as { message?: string }).message;
    } catch {
      // Non-JSON body; the status alone is the more honest message.
    }
    return { ok: false, message: message ?? `Smartsheet returned HTTP ${res.status}` };
  },

  /**
   * Labels the Connection with who the token belongs to, from the same
   * `/users/me` payload. Only the user's own id, email and name are copied out;
   * nothing here can carry credential material.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken: token } = credential as { accessToken: string };
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      id?: number;
      email?: string;
      firstName?: string;
      lastName?: string;
      account?: { id?: number; name?: string };
    } | null;
    if (!body) return {};

    return {
      user: {
        id: body.id === undefined ? undefined : String(body.id),
        email: body.email,
        name: [body.firstName, body.lastName].filter(Boolean).join(" ") || undefined,
      },
      account: {
        id: body.account?.id === undefined ? undefined : String(body.account.id),
        name: body.account?.name,
      },
    };
  },
};

export default accessToken;
