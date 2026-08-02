import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION } from "../lib/client.ts";

/**
 * OAuth 2.0 (Authorization Code) with a HighLevel Marketplace app.
 *
 * Register an app at https://marketplace.gohighlevel.com (My Apps → Create
 * App), store its `client_id` / `client_secret` / `redirect_uri` on this w6w
 * installation, and installers pick a location (or, for an Agency-scoped app,
 * a whole agency) on HighLevel's "choose location" screen.
 *
 * HighLevel specifics:
 *   - The authorize screen lives on `marketplace.gohighlevel.com`, not the
 *     API host, and is allowed implicitly as an OAuth endpoint host — it does
 *     not need to be in `w6w.network.allow`.
 *   - The token response carries `locationId` (and, for an Agency install,
 *     `companyId`) as top-level fields alongside `access_token` — HighLevel's
 *     equivalent of a QuickBooks `realmId` or a Xero tenant id, except
 *     returned directly rather than needing a follow-up discovery call. Every
 *     request that touches CRM data (contacts, opportunities, calendars, …)
 *     has to carry that `locationId`, so `afterConnect` lifts it onto the
 *     Connection's `display` for `lib/client.ts` to read — see that file's
 *     module doc.
 *   - This app only supports a Location-scoped install (`user_type: Location`,
 *     the default the chooselocation screen produces when an installer picks
 *     a single sub-account). An Agency-scoped install additionally needs the
 *     `POST /oauth/locationToken` exchange to mint a per-location token; that
 *     flow isn't implemented here.
 *   - Access tokens are valid for 1 day; refresh tokens rotate on use and are
 *     valid for a year (or until first refreshed).
 *   - Whether HighLevel's authorize endpoint supports PKCE is not documented
 *     publicly, so `pkce` is left unset rather than guessed at.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with HighLevel)",
  description:
    "Public OAuth flow. Requires a HighLevel Marketplace app registered on this w6w installation.",
  connectionLabel: "{{locationName}} ({{locationId}})",
  oauth2: {
    authorizationUrl: "https://marketplace.gohighlevel.com/v2/oauth/chooselocation",
    tokenUrl: "https://services.leadconnectorhq.com/oauth/token",
    scopes: [
      "contacts.readonly",
      "contacts.write",
      "opportunities.readonly",
      "opportunities.write",
      "calendars.readonly",
      "calendars/events.readonly",
      "calendars/events.write",
      "conversations.readonly",
      "conversations/message.write",
      "locations.readonly",
      "locations/customFields.readonly",
      "forms.readonly",
    ],
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken, locationId } = credential as {
      accessToken?: string;
      locationId?: string;
    };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    if (!locationId) {
      return {
        ok: false,
        message: "credential missing locationId — install this app on a specific location",
      };
    }
    const res = await ctx.fetch(`${API_URL}/locations/${locationId}`, {
      headers: { authorization: `Bearer ${accessToken}`, version: API_VERSION },
    });
    if (!res.ok) return { ok: false, message: `HighLevel returned ${res.status}` };
    return { ok: true };
  },

  /**
   * `locationId`/`companyId` come straight off the token response (see the
   * module doc above) — this only adds a friendly label by reading the
   * location's name and timezone back.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken, locationId, companyId } = credential as {
      accessToken?: string;
      locationId?: string;
      companyId?: string;
    };
    if (!accessToken || !locationId) return {};

    const res = await ctx.fetch(`${API_URL}/locations/${locationId}`, {
      headers: { authorization: `Bearer ${accessToken}`, version: API_VERSION },
    });
    if (!res.ok) return { locationId, companyId };
    const body = await res.json().catch(() => ({})) as {
      location?: { name?: string; timezone?: string };
    };
    return {
      locationId,
      companyId,
      locationName: body.location?.name ?? locationId,
      timezone: body.location?.timezone,
    };
  },
};

export default oauth2;
