import type { AuthDefinition } from "@w6w/types";

const CONNECTIONS_URL = "https://api.xero.com/connections";

interface XeroTenant {
  tenantId?: string;
  tenantType?: string;
  tenantName?: string;
}

/**
 * OAuth 2.0 with a Xero app.
 *
 * Xero's OAuth is unusual the same way Jira's is: the access token alone
 * doesn't say which organisation ("tenant") to call against — a token can be
 * authorised for several — so every Accounting API request must also carry
 * an `Xero-tenant-id` header naming one. `afterConnect` calls
 * `GET https://api.xero.com/connections` right after the token exchange to
 * discover the tenants the token can reach, and records the FIRST one's id
 * on the connection's `display` for `sign` to stamp onto every request —
 * the same "one Connection, one tenant" choice Jira's `oauth2.ts` makes for
 * cloud ids: a token authorised for several orgs needs one Connection per
 * org. The full list is also recorded (as `tenants`) purely for display /
 * diagnostics; nothing in this app reads it back.
 *
 * `ctx.fetch` is documented as unsigned for every auth-phase hook other than
 * `sign` itself (Hook Runtime RFC, sandbox posture table), so both `test`
 * and `afterConnect` below set the `Authorization` header by hand rather
 * than relying on the runtime to have already run `sign` for them.
 *
 * `offline_access` is in the scope list so a refresh token is issued —
 * without it the connection would die when the access token expires and
 * scheduled runs would strand. The rest of the scopes are Xero's granular
 * per-resource set (the catch-all `accounting.transactions` is being
 * retired for new apps), narrowed to exactly what this app's actions touch:
 * contacts, invoices, bank transactions, and settings — which covers both
 * Accounts and Items, since Xero has no separate scope for either.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Xero)",
  description: "Public OAuth flow. Requires a Xero app registered on this w6w installation.",
  connectionLabel: "{{tenantName}}",
  oauth2: {
    authorizationUrl: "https://login.xero.com/identity/connect/authorize",
    tokenUrl: "https://identity.xero.com/connect/token",
    refreshUrl: "https://identity.xero.com/connect/token",
    revokeUrl: "https://identity.xero.com/connect/revocation",
    scopes: [
      "offline_access",
      "accounting.contacts",
      "accounting.invoices",
      "accounting.banktransactions",
      "accounting.settings",
    ],
    pkce: true,
  },

  sign({ request, credential }, ctx) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    // Absent only while `afterConnect` itself is still resolving the tenant
    // (its own call to /connections needs no tenant header, so that is fine).
    const { tenantId } = (ctx.connection?.display ?? {}) as { tenantId?: string };
    if (tenantId) request.headers["xero-tenant-id"] = tenantId;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(CONNECTIONS_URL, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Xero returned ${res.status}` };
    const tenants = await res.json().catch(() => []) as unknown[];
    if (!Array.isArray(tenants) || tenants.length === 0) {
      return { ok: false, message: "the token grants access to no Xero organisation" };
    }
    return { ok: true };
  },

  /**
   * Resolves the tenant id. Only the FIRST accessible tenant is used — a
   * token authorised for several organisations needs one Connection per
   * organisation, which is the honest model given a Connection carries a
   * single `Xero-tenant-id`.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    const res = await ctx.fetch(CONNECTIONS_URL, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return {};
    const tenants = await res.json().catch(() => []) as XeroTenant[];
    const first = Array.isArray(tenants) ? tenants[0] : undefined;
    if (!first?.tenantId) return {};
    return {
      tenantId: first.tenantId,
      tenantName: first.tenantName,
      tenantType: first.tenantType,
      tenants: tenants
        .filter((t): t is XeroTenant & { tenantId: string } => !!t.tenantId)
        .map((t) => ({ id: t.tenantId, name: t.tenantName, type: t.tenantType })),
    };
  },
};

export default oauth2;
