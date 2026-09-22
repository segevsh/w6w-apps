import type { AuthDefinition } from "@w6w/types";
import { CloudbedsClient } from "../lib/client.ts";

/**
 * `/userinfo`'s answer. The operation's schema declares these fields at the top
 * level, with **no** `success`/`data` envelope — unlike every other read in
 * this API.
 */
interface CloudbedsUserinfo {
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

/**
 * Normalise `/userinfo`'s body.
 *
 * The reference schema is a bare object, and that is what this expects. A
 * future or proxy-meddled `{"success": true, "data": {…}}` answer is unwrapped
 * too rather than reported as "not a user profile" — the envelope is the one
 * thing this API is demonstrably inconsistent about (`success: false` on a 200
 * is the same inconsistency from the other direction), and a probe that fails
 * closed on a cosmetic wrapper would pin every connection to `not live`.
 */
function readUserinfo(body: unknown): CloudbedsUserinfo | undefined {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return undefined;
  const record = body as Record<string, unknown>;
  if (typeof record.user_id === "string") return record as CloudbedsUserinfo;
  const data = record.data;
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const inner = data as Record<string, unknown>;
    if (typeof inner.user_id === "string") return inner as CloudbedsUserinfo;
  }
  return undefined;
}

/**
 * OAuth 2.0 `authorization_code` — the technology-partner flow.
 *
 * Cloudbeds also accepts API keys, and its own docs now call those "the
 * preferred authentication method"; this app ships the OAuth path because it is
 * the one a marketplace partner registers, and it is what the app's credential
 * is designed around. The two share a host and a header shape, so a future
 * `api-key` method would slot in beside this one without touching `lib/client.ts`.
 *
 * The endpoints below were read on 2026-09-22 from the vendor's own pages, not
 * guessed:
 *
 *   - **Authorization URL**: `https://api.cloudbeds.com/api/v1.3/oauth` — the
 *     vendor's worked example in "Alternative OAuth 2.0. authentication method"
 *     is `GET https://api.cloudbeds.com/api/v1.3/oauth?client_id=…&redirect_uri=…&state=…`.
 *     The intake brief guessed `https://api.cloudbeds.com/auth/oauth/authorize`;
 *     that host/path pair does not exist. Do not "fix" this back.
 *   - **Token URL**: `https://api.cloudbeds.com/api/v1.3/access_token` — the
 *     `access_token` operation's own path, on the same declared server. (One
 *     guide page shows `hotels.cloudbeds.com/api/v1.3/access_token`; that is an
 *     alias of the same service, and a live exchange against `api.cloudbeds.com`
 *     answers the documented `401 {"error":"server_error","error_description":
 *     "Entity not found: CloudBeds\\MyFrontDesk\\API\\Models\\Client"}` for an
 *     unknown client id — i.e. it reached the client lookup.)
 *
 * Two parameters are deliberately absent:
 *
 *   - **`scopes`** — permission scopes are chosen once on the partner's "App
 *     Details" page in the developer portal, not per authorization request, and
 *     the authorize URL carries no `scope` parameter at all.
 *   - **`response_type`** — the vendor's example URL does not send one.
 *
 * `pkce: false`: PKCE is documented nowhere on Cloudbeds' side. `refresh_token`
 * is supported by the standard exchange, so no custom `refresh` hook is
 * declared — the host handles `grant_type=refresh_token` generically.
 *
 * The access token lasts `expires_in` seconds (28800 / 8 hours, per the vendor).
 * The refresh token has no fixed expiry: it stays valid for 365 days without a
 * successful use and is extended by each use, so nothing here tries to refresh
 * it proactively.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Cloudbeds)",
  description:
    "Authorization-code flow for a Cloudbeds technology partner. Requires a Cloudbeds developer " +
    "app (client_id / client_secret / redirect_uri) configured on this w6w installation, with the " +
    "permission scopes selected on the app's App Details page.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://api.cloudbeds.com/api/v1.3/oauth",
    tokenUrl: "https://api.cloudbeds.com/api/v1.3/access_token",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /userinfo` — the probe, and the reason it is the probe is the body.
   *
   * Almost every other Cloudbeds read returns guest, reservation and property
   * data; `/userinfo` returns `{user_id, first_name, last_name, email, acl?,
   * roles?}` and **no credential material of any kind** — there is no token,
   * key or secret anywhere in its schema. That makes it safe to run as a health
   * probe, safe to read a label from, and it is the one endpoint every
   * credential type can reach regardless of which permission scopes the app
   * registration was granted.
   *
   * Classification is from the **body**, never the status alone. Both live
   * 401s share a status and differ in `hint` ("Missing \"Authorization\"
   * header" versus "Access token is invalid"), and a 200 that carries
   * `{"success": false}` is a *failed* probe — `CloudbedsClient.request` throws
   * for it, exactly as for a 4xx, so both land in the same catch below.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    try {
      // `sign` is the only hook the platform auto-applies to `ctx.fetch`, and
      // it never runs for a credential that has not yet become a Connection —
      // so the header is built here explicitly, exactly like `sign` would.
      const body = await new CloudbedsClient(ctx).request("/userinfo", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      // A 200 is not enough on its own: this endpoint answers a bare user
      // object with no `success` key, so the shape is what proves it is the
      // profile and not some proxy's HTML or a cached error page.
      if (!readUserinfo(body)) {
        return { ok: false, message: "/userinfo did not return a Cloudbeds user profile" };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  },

  /**
   * Read the label from the same probe. Nothing else is taken from the
   * response — `acl` and `roles` are permission lists, not identity, and
   * storing them would make the label depend on the app registration's scopes.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    let user: CloudbedsUserinfo | undefined;
    try {
      user = readUserinfo(
        await new CloudbedsClient(ctx).request("/userinfo", {
          headers: { authorization: `Bearer ${accessToken}` },
        }),
      );
    } catch {
      // A label is a nicety: a failed read leaves the connection connected.
      return {};
    }
    if (!user) return {};
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    return {
      user: {
        id: user.user_id,
        name: name || user.email,
        email: user.email,
      },
    };
  },
};

export default oauth2;
