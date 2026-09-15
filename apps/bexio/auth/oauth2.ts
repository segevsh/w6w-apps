import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 / OpenID Connect against bexio's own Keycloak realm. There is no
 * API-key or basic-auth scheme for a third-party integration — the OpenAPI
 * document's only `securitySchemes` are `OpenIDConnect` and a bearer JWT, and
 * the "First steps" guide walks through registering an OAuth app at
 * developer.bexio.com and running the authorization-code flow.
 *
 * Endpoints below are read straight from
 * `https://auth.bexio.com/realms/bexio/.well-known/openid-configuration`
 * (fetched live 2026-09-15). bexio migrated off `idp.bexio.com` to this
 * Keycloak realm; the old host is fully decommissioned, so `idp.bexio.com`
 * must never appear here.
 *
 * Scopes are requested per resource *and* per direction — e.g. `contact_show`
 * (read) vs. `contact_edit` (write) — and the docs are explicit that
 * requesting a write scope silently also grants the matching read scope, so
 * an app that only ever writes need not also request `_show`. The set below
 * covers every action this app ships.
 *
 * Refresh tokens: bexio's realm supports the standard
 * `grant_type=refresh_token` exchange against `tokenUrl`, so no custom
 * `refresh` hook is declared — the host handles that generically.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with bexio)",
  description:
    "Public OAuth flow. Requires a bexio OAuth application (client_id / client_secret / redirect_uri) registered at developer.bexio.com and configured on this w6w installation.",
  connectionLabel: "{{company.name}}",
  oauth2: {
    authorizationUrl: "https://auth.bexio.com/realms/bexio/protocol/openid-connect/auth",
    tokenUrl: "https://auth.bexio.com/realms/bexio/protocol/openid-connect/token",
    scopes: [
      "contact_show",
      "contact_edit",
      "kb_invoice_show",
      "kb_invoice_edit",
      "kb_offer_show",
      "kb_offer_edit",
      "kb_order_show",
      "kb_order_edit",
      "article_show",
      "article_edit",
      "project_show",
      "project_edit",
      "monitoring_show",
      "monitoring_edit",
    ],
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    request.headers["accept"] = "application/json";
    return request;
  },

  /**
   * `GET /2.0/company_profile` needs only the `general` scope — the one
   * scope bexio grants to every token regardless of what was requested; it
   * does not even appear in the documented API-scopes table, which lists
   * only the resource-specific ones (`contact_show`, `article_edit`, …).
   * That makes it the narrowest usable probe: it works no matter which
   * resource scopes a given connection was granted, and its response (the
   * tenant's company profile — name, address, VAT number) contains no
   * credential material to echo back.
   *
   * Classification reads the response BODY, not just the HTTP status: every
   * bexio error is `{error_code, message}` (documented under "Errors" in the
   * API reference) regardless of which status code carries it, so a failure
   * is reported using that message rather than a guessed-at status mapping.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/2.0/company_profile`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const message = body && typeof body === "object" && "message" in body
        ? String((body as { message?: unknown }).message)
        : `bexio returned ${res.status}`;
      return { ok: false, message };
    }
    if (!Array.isArray(body) || body.length === 0) {
      return { ok: false, message: "bexio returned no company profile" };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/2.0/company_profile`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const profiles = await res.json().catch(() => []) as Array<{ id?: number; name?: string }>;
    const profile = profiles[0];
    if (!profile) return {};
    return { company: { id: profile.id, name: profile.name } };
  },
};

export default oauth2;
