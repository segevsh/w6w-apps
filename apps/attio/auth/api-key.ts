import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Attio access token — `Authorization: Bearer <token>`.
 *
 * ## Which of the two credentials this is, and why
 *
 * The Authenticating requests guide names both and draws the line for us:
 * "There are two ways to generate an access token: 1. By implementing an OAuth
 * 2.0 flow. 2. By generating an API key for your workspace. You should prefer
 * the OAuth 2.0 flow if building an app for multiple workspaces. If you are
 * building an app for a single workspace, you can manually generate an API key
 * to make requests on behalf of that workspace only."
 *
 * A w6w Connection *is* the single-workspace case: one tenant connects one Attio
 * workspace. So this ships the workspace access token. It is created in Attio's
 * developer settings, needs no app registration, no redirect URI and no client
 * secret, and works unattended.
 *
 * Both credentials go on the wire identically — "Both OAuth access tokens and
 * single-workspace access token are used in the same way. Pass the value of the
 * token in the `Authorization` header of your requests like so:
 * `Authorization: Bearer <access_token>`" — so an OAuth token pasted into this
 * field also works today, which is a happy accident rather than a design.
 *
 * Attio also accepts HTTP Basic with the token as the username: "We also support
 * HTTP Basic Authentication, where the username is the token and the password is
 * left blank. However, we recommend using Bearer authentication where possible."
 * We take the recommendation.
 *
 * ## Why OAuth 2.0 is NOT shipped as a second method
 *
 * Not an oversight — three concrete blockers, each from Attio's own reference:
 *
 *  1. **It needs a registered marketplace app.** `client_id` and `client_secret`
 *     come from build.attio.com and are per-integration, not per-user. There is
 *     no public client id to ship in an app package.
 *  2. **Scopes are not requested at authorize time.** The `/authorize` reference
 *     documents exactly four query parameters — `client_id`, `response_type`,
 *     `redirect_uri`, `state`. There is no `scope`; "when using an OAuth access
 *     token, the scopes are specified by configuring the scope settings for your
 *     app in the developer dashboard". w6w's `OAuth2Config.scopes` would have
 *     nowhere truthful to go.
 *  3. **No refresh token, and PKCE is undocumented.** `/oauth/token` documents a
 *     response of `access_token` and `token_type` only, exchanged with a
 *     `client_secret`. There is nothing for a `refresh` hook to do.
 *
 * Add a second `AuthDefinition` of `type: "oauth2"` if and when this app is
 * registered as an Attio marketplace app. Until then a declared-but-unusable
 * OAuth method would be worse than none.
 *
 * ## Scopes are real and are attached to the token, not to the call
 *
 * "Both OAuth access tokens and single-workspace access tokens use scopes to
 * control the resources that the token has access to… When using a
 * single-workspace access token, the scopes are specified in the settings UI
 * when generating the token. Scopes for single-workspace access tokens can also
 * be modified on existing tokens."
 *
 * Every endpoint documents what it needs. The ones this app calls want, between
 * them: `record_permission:read` / `:read-write`, `object_configuration:read`,
 * `list_entry:read` / `:read-write`, `list_configuration:read`, `note:read` /
 * `:read-write`, `task:read` / `:read-write`, and `user_management:read`.
 *
 * `afterConnect` reads the granted scope list back off `/v2/self` and stores it
 * as Connection display data, because "the token is live but was minted without
 * `task:read-write`" is otherwise indistinguishable from "the API is broken"
 * until the first task write fails.
 *
 * ## The probe: `GET /v2/self`, and the two things about it that matter
 *
 * ### It does NOT echo the token — checked before use
 *
 * This is the endpoint an integration reaches for, and on several other CRMs the
 * equivalent is a credential leak (Follow Up Boss's `GET /me` returns the
 * caller's own `apiKey`; Mailjet's `/v3/REST/apikey` returns key *and* secret).
 * So its response schema was read first, from `https://api.attio.com/openapi/api`.
 * The active-token arm has exactly fifteen properties:
 *
 *     active, scope, client_id, token_type, exp, iat, sub, aud, iss,
 *     authorized_by_workspace_member_id, workspace_id, workspace_name,
 *     workspace_slug, workspace_logo_url
 *
 * These are RFC 7662 introspection claims *about* the token — its scopes, its
 * issue and expiry times, the workspace it is bound to. The token itself is not
 * among them, and neither is any other secret. `tests/index.test.ts` greps the
 * whole app to keep it that way.
 *
 * ### It returns **200** for a bad token. This is the trap.
 *
 * `/v2/self` is an introspection endpoint, so "this token is invalid" is a
 * successful answer to the question it was asked. The spec says so structurally
 * — the 200 response is an `anyOf` whose first arm is `{"active": false}` — and
 * the live server confirms it. Probed on 2026-08-03, with no Attio account:
 *
 *     GET /v2/self   Authorization: Bearer <64 random hex chars>
 *     -> HTTP/2 200   {"active":false}
 *
 *     GET /v2/self   Authorization: Bearer not-a-real-token-000
 *     -> HTTP/2 400   {"status_code":400,"type":"invalid_request_error",
 *                      "code":"missing_value","message":"Token was not recognised, …"}
 *
 *     GET /v2/self   (no Authorization header at all)
 *     -> HTTP/2 400   … the same missing_value body
 *
 * So a `res.ok` check passes on a revoked token, and this endpoint never returns
 * 401 at all. `test` below therefore reads the BODY and requires
 * `active === true`. For contrast, a normal endpoint does behave normally —
 * `GET /v2/objects` with the same 64-char junk answers
 * `401 {"code":"unauthorized","message":"The API Key provided could not be found.
 * This is most commonly caused by the token having been revoked."}` — which is
 * why the client in `lib/client.ts` can keep its ordinary `!res.ok` check.
 *
 * ### And a live token with no scopes also returns `active: true`
 *
 * `scope` is a space-separated string on the active arm. An empty one means a
 * token that will 403 on every call this app makes, so `test` reports that as a
 * failure with the reason, rather than a cheerful ok followed by mystery 403s.
 */

export interface AttioCredential {
  accessToken: string;
}

/**
 * The one place the auth header is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` uses, rather than a hand-rolled second copy
 * that can drift.
 */
export function authHeaders(credential: Partial<AttioCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.accessToken ?? ""}` };
}

/** The `/v2/self` active-token arm, as declared in the OpenAPI document. */
export interface AttioSelf {
  active?: boolean;
  scope?: string;
  client_id?: string;
  token_type?: string;
  exp?: number | null;
  iat?: number;
  sub?: string;
  aud?: string;
  iss?: string;
  authorized_by_workspace_member_id?: string;
  workspace_id?: string;
  workspace_name?: string;
  workspace_slug?: string;
  workspace_logo_url?: string | null;
}

/** Split the space-separated `scope` claim into a list. */
export function parseScopes(scope: string | undefined): string[] {
  if (!scope) return [];
  return scope.split(/\s+/).filter((s) => s.length > 0);
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "Access token",
  description:
    "Paste a workspace access token from Attio → Workspace settings → Developers → your app → " +
    "API key. Sent as `Authorization: Bearer <token>`. The token carries its own scopes, chosen " +
    "when you generate it — grant every scope the actions you plan to run need, or those calls " +
    "will 403 even though the token is valid.",
  connectionLabel: "{{workspace.name}}",
  fields: [
    {
      key: "accessToken",
      label: "Access token",
      type: "secret",
      required: true,
      hint: "A single-workspace API key (or an OAuth access token — both go on the wire the same " +
        "way). Scopes to grant for full use of this app: `record_permission:read-write`, " +
        "`object_configuration:read`, `list_entry:read-write`, `list_configuration:read`, " +
        "`note:read-write`, `task:read-write`, `user_management:read`. Grant only the ones you " +
        "need; the Connection shows you what was actually granted.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it stamps
   * the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<AttioCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /v2/self` — and the body, not the status, is the answer.
   *
   * See the module comment: this endpoint answers 200 `{"active": false}` for a
   * revoked or unknown token and 400 for a malformed one, and never 401. Every
   * branch below exists because it was observed on the wire.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<AttioCredential>;
    if (!cred?.accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_URL}/self`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });

    // 400 `missing_value` is what a *malformed* token gets — Attio's own message
    // is "Token was not recognised…". It is not a server fault and it is not a
    // revocation, so it gets its own sentence.
    if (res.status === 400) {
      return {
        ok: false,
        message:
          "Attio did not recognise the value as a token at all (HTTP 400). Check it was pasted " +
          "whole — workspace API keys are 64 characters.",
      };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message: string | undefined;
      try {
        message = (JSON.parse(body) as { message?: string }).message;
      } catch {
        // Non-JSON body; the status alone is the more honest message.
      }
      return { ok: false, message: message ?? `Attio returned HTTP ${res.status}` };
    }

    const self = await res.json().catch(() => null) as AttioSelf | null;
    if (!self) return { ok: false, message: "Attio returned an unreadable /v2/self body" };

    // The whole point of this hook. A 200 here does NOT mean the token works.
    if (self.active !== true) {
      return {
        ok: false,
        message: "Attio reports this token as inactive (`/v2/self` answered HTTP 200 with " +
          '`{"active": false}`). That normally means it was revoked, or it belongs to a deleted ' +
          "workspace.",
      };
    }

    const scopes = parseScopes(self.scope);
    if (scopes.length === 0) {
      return {
        ok: false,
        message:
          "The token is active but was granted no scopes, so every call this app makes would be " +
          "rejected. Re-generate it in Attio with the scopes you need.",
      };
    }

    return { ok: true };
  },

  /**
   * Labels the Connection with the workspace, from the same `/v2/self` payload.
   *
   * One cheap read, and every field copied out is an introspection claim the
   * OpenAPI document lists on that response. Nothing here can carry credential
   * material, by construction rather than by redaction — `/v2/self` describes
   * the token and does not contain it (see the module comment).
   *
   * The granted `scopes` are stored deliberately: an operator looking at a
   * Connection that 403s on tasks should be able to see `task:read-write` is
   * missing without going to Attio to find out.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as AttioCredential;
    const res = await ctx.fetch(`${API_URL}/self`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    if (!res.ok) return {};
    const self = await res.json().catch(() => null) as AttioSelf | null;
    if (!self || self.active !== true) return {};

    return {
      workspace: {
        id: self.workspace_id,
        name: self.workspace_name,
        slug: self.workspace_slug,
      },
      token: {
        scopes: parseScopes(self.scope),
        // `exp` is `number | null`; a workspace API key has no expiry, so null
        // is the normal reading and is passed through rather than defaulted.
        expiresAt: self.exp ?? null,
        authorizedBy: self.authorized_by_workspace_member_id,
      },
    };
  },
};

export default apiKey;
