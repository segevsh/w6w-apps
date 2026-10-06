import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";
import { authHeaders, classifyProbeFailure, PROBE_PATH } from "./access-token.ts";

/**
 * OAuth 2.0 authorization-code flow. URLs and the permission list are from the
 * OpenAPI document's "Authorization" section and the OpenID discovery document
 * it quotes (`api.loyverse.com/.well-known/openid-configuration`):
 * `/oauth/authorize`, `/oauth/token`. Access tokens last 43200 s (12 h) and come
 * with a `refresh_token`. Requires an app registered at developer.loyverse.com.
 *
 * Request only the scopes the workflows need. `MERCHANT_READ` is requested by
 * default because the credential probe (`GET /merchant`) needs it.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth 2.0 (Sign in with Loyverse)",
  description:
    "Requires a Loyverse developer app (client id / secret / redirect URI) configured on this " +
    "w6w installation.",
  connectionLabel: "Loyverse ({{businessName}})",
  oauth2: {
    authorizationUrl: `${API_BASE}/oauth/authorize`,
    tokenUrl: `${API_BASE}/oauth/token`,
    scopes: [
      "MERCHANT_READ",
      "ITEMS_READ",
      "ITEMS_WRITE",
      "CUSTOMERS_READ",
      "CUSTOMERS_WRITE",
      "EMPLOYEES_READ",
      "INVENTORY_READ",
      "INVENTORY_WRITE",
      "PAYMENT_TYPES_READ",
      "RECEIPTS_READ",
      "SHIFTS_READ",
      "STORES_READ",
      "TAXES_READ",
    ],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    for (const [name, value] of Object.entries(authHeaders({ accessToken }))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ accessToken }) },
    });
    if (res.ok) return { ok: true };
    return await classifyProbeFailure(res);
  },

  async afterConnect(_input, ctx) {
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`);
      if (!res.ok) return {};
      const body = await res.json() as { business_name?: string; id?: string };
      return body?.business_name ? { businessName: body.business_name, merchantId: body.id } : {};
    } catch {
      return {};
    }
  },
};

export default oauth2;
