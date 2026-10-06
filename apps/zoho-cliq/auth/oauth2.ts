import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoCliqRegion } from "../lib/regions.ts";

/**
 * Scopes this app's actions need, each verified against the scope line under
 * the matching endpoint on `https://www.zoho.com/cliq/help/restapi/v2/`:
 *
 *   - `ZohoCliq.Channels.ALL`   — channel CRUD, members, join/leave (the page
 *                                 states it "will give the basic CRUD access to
 *                                 all Channel APIs"; the update/delete/member
 *                                 endpoints name `.UPDATE`/`.DELETE`)
 *   - `ZohoCliq.Chats.READ`     — list chats, list chat members
 *   - `ZohoCliq.Users.READ`     — list/get users, a user's teams
 *   - `ZohoCliq.Teams.READ`     — list/get teams
 *   - `ZohoCliq.Messages.READ` / `.UPDATE` / `.DELETE` — list/get, edit, delete a message
 *   - `ZohoCliq.Webhooks.CREATE` — every "post message" and "share file"
 *                                 endpoint (yes, the messaging APIs are gated
 *                                 by the *Webhooks* scope, not Messages)
 *   - `ZohoCliq.Reminders.ALL`  — reminders CRUD
 */
export const SCOPES = [
  "ZohoCliq.Channels.ALL",
  "ZohoCliq.Chats.READ",
  "ZohoCliq.Users.READ",
  "ZohoCliq.Teams.READ",
  "ZohoCliq.Messages.READ",
  "ZohoCliq.Messages.UPDATE",
  "ZohoCliq.Messages.DELETE",
  "ZohoCliq.Webhooks.CREATE",
  "ZohoCliq.Reminders.ALL",
];

/**
 * OAuth 2.0 (`oauth2`) — Zoho Cliq's connect path. Register a Zoho API
 * Console client (Server-based Applications) in the data centre your Cliq
 * organization lives in, store `client_id` / `client_secret` / `redirect_uri`
 * on this w6w installation via `PUT /apps/:id/oauth-config/oauth2-<region>`,
 * and end users then connect through the browser authorization flow.
 *
 * **One `AuthDefinition` per data centre** — see `lib/regions.ts`.
 *
 * Zoho specifics, verified 2026-10-06 against the reference's
 * "Authentication" section:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token and the connection dies in an hour.
 *   - Header shape is `Authorization: Zoho-oauthtoken <token>` — and "the
 *     access token can be passed only as a request header and not as a request
 *     parameter".
 *   - Refresh tokens are capped ("limit - 20") refreshes per the page's own
 *     wording; the access token lives one hour.
 */
function buildOAuth2(region: ZohoCliqRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Cliq organization lives in the ` +
      `${region.label} data centre (the address bar shows ${region.apiHost}) — see the ` +
      `README's "Regional data centres" section if you are not sure which one that is.`,
    connectionLabel: `Zoho Cliq (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: SCOPES,
      extraAuthParams: {
        access_type: "offline",
        prompt: "consent",
      },
      pkce: true,
    },

    sign({ request, credential }) {
      const { accessToken } = credential as { accessToken: string };
      request.headers["authorization"] = `Zoho-oauthtoken ${accessToken}`;
      return request;
    },

    /**
     * `GET /api/v2/channels?limit=1` — a cheap authenticated read needing only
     * `ZohoCliq.Channels.READ` (covered by `.ALL`) that returns channel
     * metadata, never the credential. Classified from the response BODY: Cliq
     * answers a dead token with `{"code":"oauthtoken_invalid"}`, but a call
     * with NO token with a blank two-byte `text/html` 401 — so a non-2xx
     * carrying neither a `code` nor a `message` is reported as "rejected", not
     * guessed at.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/channels?limit=1`, {
        headers: {
          accept: "application/json",
          authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });
      if (res.ok) return { ok: true };

      const text = await res.text().catch(() => "");
      let body: { code?: string; message?: string } | null = null;
      try {
        body = JSON.parse(text);
      } catch { /* blank / non-JSON body */ }
      if (body?.code || body?.message) {
        return {
          ok: false,
          message: `Zoho Cliq rejected the request${body.code ? ` (${body.code})` : ""}${
            body.message ? `: ${body.message}` : ""
          }`,
        };
      }
      return {
        ok: false,
        message: `Zoho Cliq returned HTTP ${res.status} with no error body for /channels`,
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection —
     * `lib/client.ts#apiHostFromConnection` reads it back on every action.
     */
    afterConnect(_input, _ctx) {
      return { apiHost: region.apiHost, region: region.label };
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
