import type { AuthDefinition } from "@w6w/types";
import {
  API_URL,
  INVALID_TOKEN_CODES,
  MISSING_SCOPE_CODES,
  readErrorInformation,
} from "../lib/client.ts";

/**
 * OAuth 2.0 authorization-code flow against Fortnox's own authorization
 * server (`apps.fortnox.se/oauth-v1`). The reference's `fortnoxOAuth2` scheme
 * lists exactly these two URLs (it also lists a client-credentials flow, which
 * is for service accounts and is not offered here, and an unrelated
 * `hydra.demo.ory.sh` example scheme that is ignored).
 *
 * Scopes: the reference only names `developerapi`, which is the partner API.
 * The scopes for the resources this app uses come from the Scopes guide
 * (fortnox.se/developer/guides-and-good-to-know/scopes) — one per resource
 * family, each granting read AND write. Requesting a scope the company has no
 * licence for fails the consent step (`error_missing_license`), so a Connection
 * only works for the licences the Fortnox company actually holds.
 *
 * `access_type=offline` is how Fortnox is told to issue a refresh token; the
 * authorization-code guide shows it on every authorize URL. Refresh tokens
 * ROTATE: each refresh returns a new refresh token and the old one stops
 * working, so the host must persist the response of every refresh.
 *
 * Token endpoint caveat (unverified, no live credential was available): the
 * guide's examples send the client id and secret as an HTTP Basic header, while
 * the host's generic exchange sends them as form fields. Fortnox's token
 * endpoint is not documented to reject either form.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Fortnox)",
  description:
    "Authorization-code flow. Requires a Fortnox integration (client id / client secret / redirect URI) registered in the Fortnox developer portal and configured on this w6w installation.",
  connectionLabel: "{{company.name}}",
  oauth2: {
    authorizationUrl: "https://apps.fortnox.se/oauth-v1/auth",
    tokenUrl: "https://apps.fortnox.se/oauth-v1/token",
    scopes: [
      "companyinformation",
      "profile",
      "customer",
      "supplier",
      "article",
      "invoice",
      "order",
      "offer",
      "supplierinvoice",
      "bookkeeping",
      "payment",
      "project",
      "costcenter",
    ],
    pkce: true,
    extraAuthParams: { access_type: "offline" },
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    request.headers["accept"] = "application/json";
    return request;
  },

  /**
   * `GET /3/companyinformation` — needs only the `companyinformation` scope
   * (the one the authorization guide itself uses in its example), has no
   * licence requirement ("Any" in the Scopes guide), and returns the company's
   * own name and organisation number, never the token.
   *
   * The verdict comes from the response BODY, not the status. Fortnox's
   * "Errors" guide gives a stable `Code` per failure: 2000310, 2000311 and
   * 2003275 mean the access token is wrong, missing or expired; 2000663 and
   * 2001101 mean the token is fine but the connection lacks a scope or the
   * company lacks the licence — which proves the credential works.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/3/companyinformation`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }

    const info = readErrorInformation(body);
    if (info?.code !== undefined && INVALID_TOKEN_CODES.includes(info.code)) {
      return {
        ok: false,
        message: info.message ?? `Fortnox rejected the access token (${info.code})`,
      };
    }
    if (info?.code !== undefined && MISSING_SCOPE_CODES.includes(info.code)) {
      return { ok: true, message: `token accepted; ${info.message ?? "scope or licence missing"}` };
    }
    if (!res.ok) {
      return { ok: false, message: info?.message ?? `Fortnox returned ${res.status}` };
    }
    const company = body && typeof body === "object"
      ? (body as Record<string, unknown>)["CompanyInformation"]
      : undefined;
    if (!company || typeof company !== "object") {
      return { ok: false, message: "Fortnox returned no company information" };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/3/companyinformation`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      CompanyInformation?: { CompanyName?: string; OrganizationNumber?: string };
    };
    const c = body.CompanyInformation;
    if (!c?.CompanyName) return {};
    return { company: { name: c.CompanyName, organizationNumber: c.OrganizationNumber } };
  },
};

export default oauth2;
