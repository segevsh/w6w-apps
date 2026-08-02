import type { AuthDefinition } from "@w6w/types";
import { API_HOST, MINOR_VERSION } from "../lib/client.ts";

interface QuickBooksCompanyInfo {
  CompanyInfo?: {
    CompanyName?: string;
    LegalName?: string;
  };
}

/** `GET /v3/company/{realmId}/companyinfo/{realmId}` — QuickBooks' lightest authenticated read. */
function companyInfoUrl(realmId: string): string {
  return `https://${API_HOST}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=${MINOR_VERSION}`;
}

/**
 * OAuth 2.0 with an Intuit developer app ("Sign in with Intuit").
 *
 * Endpoints, scope and grant type below are verified directly against
 * Intuit's own OAuth2 credential defaults (developer.intuit.com's
 * authentication-and-authorization docs; cross-checked against n8n's
 * `QuickBooksOAuth2Api` credential type, which hardcodes the same three
 * URLs). `pkce: false` — Intuit's documented flow is the standard
 * confidential-client authorization code grant (client id + client secret);
 * nothing in its docs mentions accepting a `code_challenge`, so this app
 * does not assert support it hasn't confirmed.
 *
 * **`realmId` is a connect-time field, not something `afterConnect`
 * resolves.** Every other per-tenant App in this pack (Xero's tenants,
 * Jira's cloud ids) discovers its tenant id by calling a "what can this
 * token reach" endpoint after the token exchange. QuickBooks Online has no
 * such endpoint — a QBO authorization grants exactly one company, and Intuit
 * communicates *which* one only by appending a `realmId` query parameter to
 * the OAuth callback redirect (confirmed against n8n's QuickBooks node,
 * which reads it off `oauthTokenData.callbackQueryString.realmId`). The
 * generic Auth `exchange` contract this pack's apps rely on
 * (`{ fields?, code?, redirectUri? }` — hook-runtime RFC) has no slot for an
 * extra provider-appended callback parameter, and this host's
 * `/oauth/callback` route currently forwards only `code`/`state`/`error` —
 * so there is today no path for `realmId` to reach any hook automatically.
 * Collecting it as a required field (like Zendesk's `subdomain` or
 * ServiceNow's `instance`) is the honest fallback: it asks the user for a
 * value they can find in the callback URL after authorizing, or on
 * QuickBooks Online's own Company Settings page. If a future host learns to
 * forward extra OAuth callback parameters into `exchange`/`afterConnect`,
 * this field can be dropped in favor of automatic discovery.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Intuit)",
  description:
    "Public OAuth flow. Requires an Intuit developer app registered on this w6w installation.",
  connectionLabel: "{{companyName}} ({{realmId}})",
  fields: [
    {
      key: "realmId",
      label: "Company ID (Realm ID)",
      type: "string",
      required: true,
      hint:
        "QuickBooks appends this as `realmId=...` to the browser URL right after you authorize — copy it from there, or find it in QuickBooks Online under Settings ⚙ → Account and settings → Billing & subscription.",
      validation: { pattern: "^[0-9]+$" },
    },
  ],
  oauth2: {
    authorizationUrl: "https://appcenter.intuit.com/connect/oauth2",
    tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    refreshUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    revokeUrl: "https://developer.api.intuit.com/v2/oauth2/tokens/revoke",
    scopes: ["com.intuit.quickbooks.accounting"],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken, realmId } = credential as { accessToken?: string; realmId?: string };
    if (!accessToken || !realmId) {
      return { ok: false, message: "credential missing accessToken or realmId" };
    }
    const res = await ctx.fetch(companyInfoUrl(realmId), {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `QuickBooks returned ${res.status}` };
    return { ok: true };
  },

  /** Records the company name for `connectionLabel`; `realmId` itself just passes through. */
  async afterConnect({ credential }, ctx) {
    const { accessToken, realmId } = credential as { accessToken?: string; realmId?: string };
    if (!realmId) return {};
    if (!accessToken) return { realmId };
    const res = await ctx.fetch(companyInfoUrl(realmId), {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { realmId };
    const body = await res.json().catch(() => ({})) as QuickBooksCompanyInfo;
    return {
      realmId,
      companyName: body.CompanyInfo?.CompanyName,
      legalName: body.CompanyInfo?.LegalName,
    };
  },
};

export default oauth2;
