import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization code — connect a user's Inoreader account.
 *
 * Verified against https://www.inoreader.com/developers/oauth and by live probes on 2026-10-06:
 *
 *   | Request                                                       | Result                                                                  |
 *   | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
 *   | `POST /oauth2/token` refresh grant, bogus client              | `400 {"error":"invalid_client","error_description":"The client credentials are invalid"}` |
 *   | `GET /reader/api/0/user-info`, no credential                  | `403` text `AppId required! Contact app developer.`                      |
 *   | `GET /reader/api/0/user-info`, `Authorization: Bearer bogus`  | `401` text `OAuth token not found or invalid.`                           |
 *
 * ## What is NOT needed
 *
 * `AppId` / `AppKey` headers. The App authentication page is explicit: "App authentication is
 * only needed when using ClientLogin for user authentication." With an OAuth bearer token the
 * API takes `Authorization: Bearer <token>` alone. (The 403 above is what an UNSIGNED call
 * gets, which is why the `api` health check treats it as proof of reachability.)
 *
 * ## Where the client id and secret live
 *
 * On the w6w server (the app's oauth-config), never in this package. They are created
 * self-serve in Inoreader's Preferences > Developer ("Create new application") — which itself
 * requires a paid plan; Free accounts "will not be granted access to the developer API".
 *
 * ## Scopes
 *
 * `read` or `read write` (Inoreader's own wording on the OAuth page). Zone 2 methods — every
 * write — need `write`, and a scope cannot exceed what the application registration allows
 * ("If you set 'Read only' in your app settings, you will not be able to request the write
 * scope"). This app requests `read write` because most of its actions are writes.
 *
 * ## PKCE
 *
 * The documented authorization URL and token request carry no `code_challenge`/`code_verifier`,
 * so `pkce: false` — the same call the sibling `linkedin` app makes.
 *
 * ## Refresh
 *
 * The documented refresh is the standard `grant_type=refresh_token` POST with `client_id` and
 * `client_secret` in a form body, which the runtime's built-in handler performs. No custom hook.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Connect Inoreader account)",
  description:
    "Authorize an Inoreader account through Inoreader's consent page. Requires a developer " +
    "application created in Inoreader Preferences (paid plan) and an account on a plan that " +
    "includes API access.",
  connectionLabel: "{{user.name}}",
  oauth2: {
    authorizationUrl: "https://www.inoreader.com/oauth2/auth",
    tokenUrl: "https://www.inoreader.com/oauth2/token",
    scopes: ["read", "write"],
    scopeSeparator: " ",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /user-info` (zone 1). The body carries the user's id, name and email — never the
   * token — so it is safe as the probe. The verdict comes from the BODY: a 200 only counts when
   * it holds a `userId`, because Inoreader's edge can answer 200 HTML for anything it
   * does not serve.
   */
  async test({ credential }, ctx) {
    const res = await ctx.fetch(`${API_BASE}/user-info`, {
      headers: { accept: "application/json", ...bearer(credential) },
    });
    const text = await res.text();

    if (res.status === 429) {
      return {
        ok: false,
        message: "Inoreader rate-limited the check (daily zone 1 quota spent); the token was " +
          "not judged.",
      };
    }
    if (res.ok) {
      const body = parse(text);
      if (body && body.userId !== undefined && body.userId !== null) return { ok: true };
      return {
        ok: false,
        message: `Inoreader answered ${res.status} but not with a user object — not the ` +
          "documented /user-info response.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Inoreader refused the token (401 ${errorText(text)}). It was revoked or ` +
          "expired — reconnect the account.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Inoreader answered 403 ${errorText(text)}. The request carried no usable ` +
          "access token, or the account's plan has no API access.",
      };
    }
    return { ok: false, message: `Inoreader returned HTTP ${res.status} for /user-info` };
  },

  async afterConnect(_input, ctx: HookContext) {
    try {
      const res = await ctx.fetch(`${API_BASE}/user-info`, {
        headers: { accept: "application/json" },
      });
      const body = parse(await res.text());
      if (!res.ok || !body || body.userId === undefined) return {};
      return {
        user: {
          id: String(body.userId),
          name: typeof body.userName === "string" && body.userName
            ? body.userName
            : `Inoreader user ${body.userId}`,
        },
      };
    } catch {
      return {};
    }
  },
};

function bearer(credential: unknown): Record<string, string> {
  const token = (credential as { accessToken?: string } | undefined)?.accessToken;
  return token ? { authorization: `Bearer ${token}` } : {};
}

function parse(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" ? v as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export default oauth2;
