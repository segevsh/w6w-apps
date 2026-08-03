import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Google spells its OAuth scopes as URL-shaped *identifiers*. `www.googleapis.com`
 * is the namespace those URNs live in — it is never fetched, and it is
 * deliberately absent from `w6w.network.allow`: this app's only API host is
 * `chat.googleapis.com`, and allowing the generic Google API host would widen
 * the sandbox to every Google service for no reason. Composing the URN from a
 * named constant keeps that distinction explicit in the source rather than
 * leaving a bare URL literal that reads like an endpoint.
 */
const SCOPE_NAMESPACE = "www.googleapis.com/auth";
const scope = (name: string) => `https://${SCOPE_NAMESPACE}/${name}`;

/**
 * OAuth 2.0 — **user authentication**, the only auth path this app ships.
 *
 * Google Chat has two distinct authentication modes and they are not
 * interchangeable:
 *
 *   - **User authentication** (this): a human consents, the API acts *as that
 *     human*. Messages are attributed to them, and the app can only see spaces
 *     they are a member of.
 *   - **App authentication**: a Chat app configured in the Google Cloud console,
 *     calling with service-account credentials and the `chat.bot` /
 *     `chat.app.*` scopes. Messages are attributed to the Chat app.
 *
 * A bare service account is deliberately **not** offered. It is not merely a
 * matter of adding a JWT flow: a service account has no Chat presence at all
 * until a Chat app is configured against that Cloud project in the Google Chat
 * API console and installed in the target space, and the `chat.app.*` scopes
 * explicitly document that user credentials and domain-wide delegation are
 * unsupported for them. Shipping a service-account method would therefore ship a
 * credential that cannot make a single call in this app's action set. The
 * sibling `google-tasks` and `google-contacts` apps made the same call.
 *
 * Scope choice — three, and only three, chosen to be exactly what the 18 actions
 * here need (verified against the v1 discovery document's per-method `scopes`):
 *
 *   - `chat.spaces`      → spaces list/get/create/setup/patch/findDirectMessage
 *   - `chat.messages`    → messages create/get/list/search/update/delete
 *                          and reactions create/list/delete
 *   - `chat.memberships` → members list/create/delete
 *
 * Notably absent: `chat.delete` (nothing here deletes a space), `chat.admin.*`
 * (no action sets `useAdminAccess`), `chat.import`, `chat.bot` and every
 * `chat.app.*` scope. Each `.readonly` variant is a strict subset of the
 * read-write scope requested, so asking for both would add nothing.
 * See https://developers.google.com/workspace/chat/authenticate-authorize.
 *
 * There is deliberately no `afterConnect`: the Chat API exposes no whoami for a
 * user credential, and Google's userinfo endpoint would require an extra
 * identity scope this app has no reason to hold. A connection is therefore
 * labelled by the host's default, not by an invented identity lookup.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow, acting as the signed-in user. Requires a Google Cloud project with the Google Chat API enabled and OAuth client credentials configured on this w6w installation. Google Chat is a Google Workspace feature — a consumer @gmail.com account cannot use the Chat API.",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [
      scope("chat.spaces"),
      scope("chat.messages"),
      scope("chat.memberships"),
    ],
    // Google needs these on the authorize URL to hand back a refresh_token.
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    // `spaces.list` is the cheapest read that proves a Chat scope is present,
    // and it is reachable by `chat.spaces.readonly` as well as `chat.spaces` —
    // so this never reports a working, read-only credential as broken. Capping
    // the page at 1 keeps it cheap; a user in no spaces still returns 200.
    const res = await ctx.fetch(`${API_URL}/spaces?pageSize=1`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Google Chat returned ${res.status}` };
    return { ok: true };
  },
};

export default oauth2;
