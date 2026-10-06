import type { AuthDefinition, HookContext } from "@w6w/types";
import {
  type Environment,
  errorMessage,
  HOSTS,
  normalizeTenantId,
  parseEnvironment,
} from "../lib/client.ts";

/**
 * OAuth2 **client credentials** grant against ServiceTitan's token endpoint,
 * plus an application key on every API call.
 *
 * ## What a ServiceTitan connection is made of
 *
 * Each integration is a registered *app* in the developer portal; the tenant
 * (a customer's ServiceTitan account) installs it, and the portal issues three
 * secrets that must travel together: a **Client ID**, a **Client Secret**, and
 * an **App Key** (the `ST-App-Key` header the spec declares as its
 * `apiKeyHeader` security scheme). Every request needs BOTH the bearer token
 * and the app key — an unsigned call answers `401 "Application key not present,
 * check ST-App-Key header value."` (probed live against both environments).
 * The numeric **Tenant ID** is not a secret and is a path segment on every
 * operation, so it is kept as connection metadata.
 *
 * ## `type: "custom"`
 *
 * The spec's `oauth` scheme is `clientCredentials` with `tokenUrl`
 * `https://auth.servicetitan.io/connect/token` — no redirect step, so the
 * `oauth2` authorization-code model does not apply. The token is minted by
 * hand, form-encoded (`grant_type`, `client_id`, `client_secret`), per the
 * OAuth 2 client-credentials convention the endpoint follows (it answers a
 * wrong id with `400 {"error":"invalid_client"}`, probed live). Tokens are
 * short-lived and there is no refresh token, so `refresh` re-runs the exchange.
 *
 * `integration` is a separate host pair with separate credentials.
 */

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

/** What this app persists on the Connection. */
export interface ServiceTitanCredential {
  tenantId: string;
  environment: Environment;
  clientId: string;
  clientSecret: string;
  appKey: string;
  accessToken?: string;
  expiresAt?: string;
}

type Base = Pick<
  ServiceTitanCredential,
  "tenantId" | "environment" | "clientId" | "clientSecret" | "appKey"
>;

async function requestToken(ctx: HookContext, base: Base): Promise<TokenResponse> {
  const res = await ctx.fetch(`${HOSTS[base.environment].auth}/connect/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: base.clientId,
      client_secret: base.clientSecret,
    }).toString(),
  });

  const text = await res.text().catch(() => "");
  let body: TokenResponse = {};
  try {
    body = text ? JSON.parse(text) as TokenResponse : {};
  } catch {
    body = {};
  }
  if (!res.ok || !body.access_token) {
    const detail = errorMessage(text);
    throw new Error(
      `ServiceTitan token request failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return body;
}

/** Fold a token response into the stored credential, with a 60-second skew haircut. */
function foldToken(base: Base, body: TokenResponse): ServiceTitanCredential {
  return {
    ...base,
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 900) - 60) * 1000).toISOString(),
  };
}

function baseFrom(f: Record<string, unknown>): Base {
  const clientId = String(f.clientId ?? "").trim();
  const clientSecret = String(f.clientSecret ?? "").trim();
  const appKey = String(f.appKey ?? "").trim();
  if (!clientId || !clientSecret || !appKey) {
    throw new Error("Client ID, Client Secret and App Key are all required.");
  }
  return {
    tenantId: normalizeTenantId(f.tenantId),
    environment: parseEnvironment(f.environment),
    clientId,
    clientSecret,
    appKey,
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "App credentials (Client Credentials)",
  description:
    "Register an app in the ServiceTitan developer portal and have your tenant install it. The " +
    "portal gives you a Client ID, Client Secret and App Key; the Tenant ID is shown in the " +
    "tenant's integration settings.",
  connectionLabel: "Tenant {{tenant.id}} ({{tenant.environment}})",
  fields: [
    {
      key: "tenantId",
      label: "Tenant ID",
      type: "string",
      required: true,
      placeholder: "1234567890",
      hint: "The numeric id of the ServiceTitan tenant (account) that installed the app.",
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      default: "production",
      options: [
        { value: "production", label: "Production (api.servicetitan.io)" },
        { value: "integration", label: "Integration sandbox (api-integration.servicetitan.io)" },
      ],
      hint: "Credentials are not shared between the two.",
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "From the app's page in the developer portal.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
      hint: "Regenerating it invalidates every token minted from it.",
    },
    {
      key: "appKey",
      label: "App Key",
      type: "secret",
      required: true,
      hint: "Sent as the `ST-App-Key` header on every request.",
    },
  ],

  /** Turns the pasted credentials into a live access token at connect time. */
  async exchange({ fields }, ctx) {
    const base = baseFrom((fields ?? {}) as Record<string, unknown>);
    return foldToken(base, await requestToken(ctx, base));
  },

  /** Re-mint from the stored client id and secret — there is no refresh token. */
  async refresh({ credential }, ctx) {
    const c = credential as Partial<ServiceTitanCredential>;
    if (!c.clientId || !c.clientSecret || !c.appKey || !c.tenantId) {
      throw new Error(
        "credential is missing clientId, clientSecret, appKey or tenantId — reconnect",
      );
    }
    const base = baseFrom(c as Record<string, unknown>);
    return foldToken(base, await requestToken(ctx, base));
  },

  /** The only hook that stamps credential-derived headers. Runs network-less. */
  sign({ request, credential }) {
    const { accessToken, appKey } = credential as Partial<ServiceTitanCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    request.headers["st-app-key"] = appKey ?? "";
    return request;
  },

  /**
   * `GET /settings/v2/tenant/{id}/business-units?pageSize=1` is the probe: a
   * small read that returns business-unit names, never a credential. ServiceTitan
   * documents no whoami or ping endpoint (checked: none in any of the specs read).
   */
  async test({ credential }, ctx) {
    const c = credential as Partial<ServiceTitanCredential>;
    if (!c?.accessToken) return { ok: false, message: "credential missing an access token" };
    if (!c.appKey) return { ok: false, message: "credential missing the app key" };
    if (!c.tenantId) return { ok: false, message: "credential missing the tenant id" };

    const api = HOSTS[parseEnvironment(c.environment)].api;
    const res = await ctx.fetch(
      `${api}/settings/v2/tenant/${normalizeTenantId(c.tenantId)}/business-units?pageSize=1`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${c.accessToken}`,
          "ST-App-Key": c.appKey,
        },
      },
    );
    const text = await res.text().catch(() => "");
    const detail = errorMessage(text);
    if (res.status === 401) {
      return {
        ok: false,
        message: `ServiceTitan rejected the credentials (401${detail ? `: ${detail}` : ""}). ` +
          "The token may have expired, or the app key or client secret is wrong.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "ServiceTitan returned 403 — the token is valid, but the app was not granted " +
          "the Settings → Business Units read scope (tn.stt.businessunits:r) or the tenant has " +
          "not installed it.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `ServiceTitan returned ${res.status}${detail ? `: ${detail}` : ""}`,
      };
    }
    return { ok: true };
  },

  /** Records which tenant and environment this connection targets (neither is a secret). */
  afterConnect({ credential }) {
    const c = credential as Partial<ServiceTitanCredential>;
    if (!c?.tenantId) return {};
    const environment = parseEnvironment(c.environment);
    return {
      tenantId: c.tenantId,
      environment,
      tenant: { id: c.tenantId, environment },
    };
  },
  // No `revoke`: the token endpoint is the only documented auth surface.
};

export default clientCredentials;
