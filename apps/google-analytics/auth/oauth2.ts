import type { AuthDefinition } from "@w6w/types";
import { ADMIN_API } from "../lib/client.ts";

/**
 * Google spells its OAuth scopes as URL-shaped *identifiers*. `www.googleapis.com`
 * is the namespace those URNs live in — it is never fetched, and it is
 * deliberately absent from `w6w.network.allow`: this app's API hosts are
 * `analyticsdata.googleapis.com` and `analyticsadmin.googleapis.com`, and
 * allowing the generic Google API host would widen the sandbox to every Google
 * service for no reason. Composing the URN from a named constant keeps that
 * distinction explicit rather than leaving a bare URL literal that reads like
 * an endpoint. (Same reasoning, same wording, as this pack's `google-ads` app.)
 */
const SCOPE_NAMESPACE = "www.googleapis.com/auth";
const scope = (name: string) => `https://${SCOPE_NAMESPACE}/${name}`;

/**
 * OAuth 2.0 — the only interactive auth path Google offers for the Analytics
 * APIs — plus the one connection field OAuth cannot supply.
 *
 * **Scopes.** Both discovery documents name their own, and the pair below is
 * the smallest set that covers what this app does:
 *
 *   - `analytics.readonly` — every report and every Admin read. Named by both
 *     the Data API and the Admin API discovery documents.
 *   - `analytics.edit` — the Admin writes (create/update a property, create an
 *     audience export). Named by the Admin API document only.
 *
 * The broader `analytics` scope that the Data API also lists is deliberately
 * not requested: it is the legacy Universal Analytics scope and grants more
 * than this app uses.
 *
 * **`propertyId`.** The property a call is addressed to is a path segment, so
 * it has to be visible to actions. It travels via `afterConnect` onto the
 * Connection's redacted `display`, and each action can override it — one grant
 * commonly reaches many properties.
 *
 * Google requires `access_type=offline` + `prompt=consent` on the authorize URL
 * to reliably hand back a refresh token; without one the connection dies in an
 * hour and scheduled runs stop.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the Google Analytics Data and " +
    "Admin APIs enabled and OAuth client credentials configured on this w6w installation.",
  connectionLabel: "{{propertyName}} ({{propertyId}})",
  fields: [
    {
      key: "propertyId",
      label: "Property ID",
      type: "string",
      required: true,
      placeholder: "123456789",
      hint: "The GA4 property these actions default to — Admin → Property Settings → " +
        "Property ID. The `properties/` prefix is optional.",
      validation: { pattern: "^(properties/)?[0-9]+$" },
    },
  ],
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [scope("analytics.readonly"), scope("analytics.edit")],
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    pkce: true,
  },

  /** The only hook handed the credential. It stamps the bearer and returns. */
  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `accountSummaries.list` is the right liveness probe: it is the one
   * Analytics endpoint that takes no account or property id, needs only
   * `analytics.readonly`, and returns the whole tree the credential can see —
   * so it proves the bearer without assuming the connection's `propertyId` is
   * already correct. A credential with nothing accessible still answers 200
   * with an empty object, which is a working connection with no data behind it
   * and is reported as such.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${ADMIN_API}/accountSummaries?pageSize=1`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.status === 401) return { ok: false, message: "Google rejected the token (401)" };
    if (res.status === 403) {
      return {
        ok: false,
        message: "the Analytics Admin API is not enabled for this project, or the scope was " +
          "not granted (403)",
      };
    }
    if (!res.ok) return { ok: false, message: `Google Analytics returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the property so actions can build paths, and labels the connection
   * with its display name. Best-effort: a failed lookup must not fail the
   * connect flow, and the property id is recorded either way because that is
   * the part actions cannot work without.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken, propertyId } = credential as {
      accessToken: string;
      propertyId?: string;
    };
    const id = String(propertyId ?? "").trim().replace(/^properties\//, "");
    if (!id) return {};
    const res = await ctx.fetch(`${ADMIN_API}/properties/${encodeURIComponent(id)}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { propertyId: id };
    const body = await res.json().catch(() => null) as {
      displayName?: string;
      currencyCode?: string;
      timeZone?: string;
      account?: string;
    } | null;
    return {
      propertyId: id,
      propertyName: body?.displayName,
      timeZone: body?.timeZone,
      currencyCode: body?.currencyCode,
      account: body?.account,
    };
  },
};

export default oauth2;
