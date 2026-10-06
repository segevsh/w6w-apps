import type { AuthDefinition } from "@w6w/types";
import { classifyProbe, runProbe } from "../lib/probe.ts";

/**
 * OAuth 2.0 authorization-code flow, verified against
 * developers.outreach.io/api/oauth (the page's Markdown rendering).
 *
 *  - authorize: https://api.outreach.io/oauth/authorize (`response_type=code`,
 *    space-separated `scope`, optional `state`)
 *  - token:     POST https://api.outreach.io/oauth/token, form-encoded
 *    `client_id`, `client_secret`, `redirect_uri`, `grant_type`, `code`
 *  - refresh:   same endpoint, `grant_type=refresh_token`
 *
 * Lifetimes (getting-started, "Token Availability"): access token 2 hours,
 * refresh token 14 days, and **a new refresh token is issued with every access
 * token** — the previous one must be discarded. A user/app pair may mint at most
 * 100 live tokens, and a token can be fetched at most once every 60 seconds
 * (429 otherwise). The host's refresh handling must therefore persist the
 * rotated refresh token each time.
 *
 * Outreach documents no PKCE support, so it is left off.
 *
 * Scopes are `<resource>.<read|write|delete|all>`, and are NOT additive
 * (`prospects.write` does not grant read). The docs print only `prospects.*`,
 * `users.read` and `accounts.read` verbatim; the rest follow the documented rule
 * with the collection path segment as the resource name. The scopes that are
 * actually granted are the ones registered on the Outreach app, so an operator
 * can override this default list in the server-side OAuth config.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Outreach)",
  description:
    "Requires an Outreach app (developers.outreach.io > My apps) with a redirect URI and the OAuth scopes you need; its client ID and secret are configured on this w6w installation.",
  connectionLabel: "Outreach",
  oauth2: {
    authorizationUrl: "https://api.outreach.io/oauth/authorize",
    tokenUrl: "https://api.outreach.io/oauth/token",
    scopes: [
      "prospects.all",
      "accounts.all",
      "opportunities.all",
      "sequences.read",
      "sequenceStates.all",
      "tasks.all",
      "prospectNotes.all",
      "mailings.read",
      "mailboxes.read",
      "users.read",
      "webhooks.all",
    ],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const { response, body } = await runProbe(ctx, { authorization: `Bearer ${accessToken}` });
    const verdict = classifyProbe(response.status, body);
    return verdict.ok ? { ok: true } : { ok: false, message: verdict.message };
  },
};

export default oauth2;
