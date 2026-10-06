import type { AuthDefinition } from "@w6w/types";
import { ACCOUNTS_URL, isMissingScope, readError } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization-code flow against Salla's own authorization server
 * (`accounts.salla.sa`), the "Custom Mode" of the Authorization guide — the
 * mode that works with a free app registered at salla.partners. (Salla also
 * has an "Easy Mode" that hands the token to a webhook; it is the only mode
 * allowed for apps published on the Salla App Store, and is not a flow a host
 * can drive.)
 *
 * - Endpoints: `https://accounts.salla.sa/oauth2/auth` and `/oauth2/token`
 *   (the Authorization guide's endpoint table; the refresh endpoint is the
 *   same token URL).
 * - Scopes are `<resource>.read` / `<resource>.read_write`, space separated,
 *   and `offline_access` is what makes Salla issue a refresh token.
 * - Access tokens last 14 days; refresh tokens one month and ROTATE — each
 *   refresh returns a new refresh token and invalidates the old one. Using a
 *   refresh token twice (two parallel refreshes) revokes the whole grant, so
 *   the host must serialise refreshes and persist every response.
 * - The guide documents no PKCE, so it is off.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Salla)",
  description:
    "Authorization-code flow (Custom Mode). Requires an app (client id / client secret / redirect URI) registered at salla.partners and configured on this w6w installation.",
  connectionLabel: "{{store.name}}",
  oauth2: {
    authorizationUrl: `${ACCOUNTS_URL}/oauth2/auth`,
    tokenUrl: `${ACCOUNTS_URL}/oauth2/token`,
    scopes: [
      "offline_access",
      "settings.read",
      "products.read_write",
      "orders.read_write",
      "customers.read_write",
      "categories.read_write",
      "brands.read_write",
      "marketing.read_write",
    ],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    request.headers["accept"] = "application/json";
    return request;
  },

  /**
   * `GET https://accounts.salla.sa/oauth2/user/info` — the User Info endpoint
   * of the Authorization guide. It needs no scope beyond `offline_access`, so a
   * connection that was granted only a few resource scopes still tests green,
   * and it returns the authorising user and store (id, name, plan), never the
   * token.
   *
   * The verdict comes from the response BODY. Salla answers 401 both for a bad
   * token ("The access token is invalid") and for a good token missing a scope
   * ("The access token should have access to one of those scopes: …"), so a
   * status code alone cannot tell them apart; the second proves the credential
   * works and passes.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${ACCOUNTS_URL}/oauth2/user/info`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }

    const info = readError(body);
    if (isMissingScope(info)) {
      return { ok: true, message: `token accepted; ${info?.message}` };
    }
    if (info || !res.ok) {
      return { ok: false, message: info?.message ?? `Salla returned ${res.status}` };
    }
    const data = body && typeof body === "object"
      ? (body as Record<string, unknown>)["data"]
      : undefined;
    if (
      !data || typeof data !== "object" || (data as Record<string, unknown>)["id"] === undefined
    ) {
      return { ok: false, message: "Salla returned no user information" };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${ACCOUNTS_URL}/oauth2/user/info`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { name?: string; store?: { id?: number; name?: string; plan?: string } };
    };
    const store = body.data?.store;
    if (!store?.name) return {};
    return { store: { id: store.id, name: store.name, plan: store.plan } };
  },
};

export default oauth2;
