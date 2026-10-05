import type { AuthDefinition } from "@w6w/types";
import {
  baseUrl,
  describeError,
  normalizeHost,
  normalizeTenant,
  type Target,
  targetFromConnection,
  tokenUrl,
} from "../lib/client.ts";

/**
 * An API client registered with Workday's "Register API Client for Integrations"
 * task, authorized with a **non-expiring refresh token**.
 *
 * ## Why not the stock oauth2 type
 *
 * Workday's token URL is per-tenant — `https://{host}/ccx/oauth2/{tenant}/token` —
 * so the static `oauth2.tokenUrl` the platform's oauth2 type needs does not exist.
 * This is a `custom` method: the connect form collects host, tenant, client id,
 * client secret and refresh token, and `exchange` / `refresh` trade the refresh token
 * for a short-lived access token with `grant_type=refresh_token`, the client
 * authenticating with HTTP Basic (`client_id:client_secret`).
 *
 * `sign` cannot do the exchange itself — it runs network-less and is the only hook
 * handed the credential — so the exchange lives in the two hooks that can call
 * `ctx.fetch`, and `sign` only stamps the stored access token.
 *
 * ## How to obtain the refresh token
 *
 * In Workday: run the task *Register API Client for Integrations*, tick
 * **Non-Expiring Refresh Tokens**, choose the functional-area scopes (Staffing,
 * Time Off and Leave, Organizations and Roles, Time Tracking, Person Data ...),
 * and save to get the client ID and secret. Then, on the API client, use
 * *Manage Refresh Tokens for Integrations* to generate the token for the
 * Integration System User. The refresh token is not rotated by a refresh.
 *
 * ## Host and tenant are validated
 *
 * The host must be a bare `*.workday.com` / `*.myworkday.com` name — see
 * `lib/client.ts` — because the credential is posted to it.
 */
const auth: AuthDefinition = {
  key: "refresh-token",
  type: "custom",
  displayName: "API client + refresh token",
  connectionLabel: "{{tenant}} — {{host}}",
  description:
    "A Workday API client (client ID and secret) and its non-expiring refresh token. Register the client " +
    "with the task 'Register API Client for Integrations', tick Non-Expiring Refresh Tokens, then generate " +
    "the token with 'Manage Refresh Tokens for Integrations'.",
  fields: [
    {
      key: "host",
      label: "Workday host",
      type: "string",
      required: true,
      placeholder: "wd2-impl-services1.workday.com",
      hint:
        "The services host of your data center, shown by 'View API Clients' as the Workday REST API " +
        "Endpoint. Hostname only, ending in .workday.com or .myworkday.com.",
    },
    {
      key: "tenant",
      label: "Tenant",
      type: "string",
      required: true,
      hint: "Your Workday tenant name, the last segment of the REST API Endpoint.",
    },
    { key: "clientId", label: "Client ID", type: "string", required: true },
    { key: "clientSecret", label: "Client secret", type: "secret", required: true },
    { key: "refreshToken", label: "Refresh token", type: "secret", required: true },
  ],

  async exchange({ fields }, ctx) {
    const v = (fields ?? {}) as Record<string, unknown>;
    const target = { host: normalizeHost(v.host), tenant: normalizeTenant(v.tenant) };
    const clientId = String(v.clientId ?? "").trim();
    const clientSecret = String(v.clientSecret ?? "").trim();
    const refreshToken = String(v.refreshToken ?? "").trim();
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("`clientId`, `clientSecret` and `refreshToken` are all required");
    }
    const token = await mint(target, clientId, clientSecret, refreshToken, ctx.fetch);
    return { ...target, clientId, clientSecret, refreshToken, ...token };
  },

  async refresh({ credential }, ctx) {
    const c = (credential ?? {}) as Record<string, unknown>;
    const token = await mint(
      { host: normalizeHost(c.host), tenant: normalizeTenant(c.tenant) },
      String(c.clientId ?? ""),
      String(c.clientSecret ?? ""),
      String(c.refreshToken ?? ""),
      ctx.fetch,
    );
    return { ...c, ...token };
  },

  // The only code handed the credential. Network-less: stamp and return.
  sign({ request, credential }) {
    // Never overwrite the token request's own Basic header, and never carry a
    // bearer to a host other than the one this connection was made for.
    if (new URL(request.url).pathname.startsWith("/ccx/oauth2/")) return request;
    const c = (credential ?? {}) as Record<string, unknown>;
    if (new URL(request.url).hostname !== String(c.host ?? "")) {
      throw new Error(
        "Refusing to sign a request to a host other than the connection's Workday host",
      );
    }
    return {
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${String(c.accessToken ?? "")}` },
    };
  },

  async test({ credential }, ctx) {
    const c = (credential ?? {}) as Record<string, unknown>;
    let target: Target;
    try {
      target = { host: normalizeHost(c.host), tenant: normalizeTenant(c.tenant) };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
    // Staffing `GET /workers?limit=1`: the body holds a worker's name, never a credential.
    const url = `${baseUrl(target, "staffing")}/workers?limit=1`;
    let res: Response;
    try {
      res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    } catch (err) {
      return { ok: false, message: `could not reach ${target.host}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (res.ok) {
      return {
        ok: true,
        message: `authenticated against tenant ${target.tenant} (${target.host})`,
      };
    }
    // 403 is Workday's schema-correct "authenticated, but not allowed": the token and
    // tenant are good, the API client simply lacks the Staffing scope or policy.
    if (res.status === 403) {
      return {
        ok: true,
        message: `authenticated against tenant ${target.tenant}, but the API client cannot read ` +
          `workers (${describeError(403, text)})`,
      };
    }
    return { ok: false, message: describeError(res.status, text) };
  },

  afterConnect({ credential }) {
    const target = targetFromConnection({ display: credential });
    return { host: target.host, tenant: target.tenant };
  },
};

interface TokenResponse {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
  error_description?: string;
}

/** `POST https://{host}/ccx/oauth2/{tenant}/token`, `grant_type=refresh_token`, Basic client auth. */
async function mint(
  target: Target,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>,
): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetchImpl(tokenUrl(target), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
      .toString(),
  });
  const text = await res.text().catch(() => "");
  let token: TokenResponse = {};
  try {
    token = JSON.parse(text) as TokenResponse;
  } catch { /* handled below */ }

  // Classify from the body's own OAuth error code; the status is only a hint.
  if (token.error) {
    const hint = token.error === "invalid_client"
      ? " — the client ID/secret pair was rejected: a deleted or mistyped API client"
      : token.error === "invalid_grant"
      ? " — the refresh token was rejected: revoked, generated for another API client, or for a " +
        "different tenant"
      : "";
    throw new Error(
      `Workday refused the token request (${res.status} ${token.error}` +
        `${token.error_description ? `: ${token.error_description}` : ""})${hint}`,
    );
  }
  if (!res.ok) throw new Error(`Workday ${res.status} minting a token: ${text.slice(0, 160)}`);
  if (!token.access_token) throw new Error("Workday returned no `access_token`");

  // Workday does not state a lifetime on every tenant; assume one hour and expire early.
  const seconds = Number(token.expires_in ?? 3600) || 3600;
  const early = Math.max(60, seconds - 120);
  return {
    accessToken: token.access_token,
    expiresAt: new Date(Date.now() + early * 1000).toISOString(),
  };
}

export default auth;
