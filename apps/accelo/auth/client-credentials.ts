import type { AuthDefinition, HookContext } from "@w6w/types";
import { apiBase, DEPLOYMENT_PATTERN, normalizeDeployment, oauthBase } from "../lib/client.ts";

/**
 * Service Application (OAuth 2.0 client credentials) — `custom`.
 *
 * Accelo registers an API application per deployment under Configuration →
 * API → Register Application and offers three kinds. Only the **Service
 * Application** is built here: it needs no end-user redirect, so it works in
 * scheduled and background runs. (Web and Installed applications use the
 * authorization-code grant against the *customer's* deployment host, which
 * this pack's static `oauth2` type cannot address.)
 *
 * The exchange is documented as:
 *
 *     POST https://{deployment}.api.accelo.com/oauth2/v0/token
 *     Authorization: Basic base64(client_id:client_secret)
 *     Content-Type: application/x-www-form-urlencoded
 *
 *     grant_type=client_credentials&scope=read(all)&expires_in=...
 *
 * Quirks that matter, verified against the live host 2026-10-06:
 *
 *   - the client id/secret travel in HTTP **Basic**, not in the form body, and
 *     a wrong pair answers `401 {"error":"invalid_client", "error_description":…}`
 *     — the RFC 6749 shape, NOT the `{meta,response}` envelope the resource API uses;
 *   - the token is requested from the customer's own host, so the deployment
 *     name is part of the credential, and `afterConnect` copies it onto the
 *     connection's redacted display data so the client can build URLs;
 *   - `expires_in` is documented as a string (`"2592000"`, 30 days by default),
 *     so it is coerced with `Number`;
 *   - `scope` defaults to `read(all)`, which cannot write — the field below
 *     defaults to `write(all)` (read and write), and may be narrowed.
 *
 *   exchange — client id + secret -> a live bearer token
 *   refresh  — the same call again (service applications have no refresh_token)
 *   sign     — stamps `Authorization: Bearer <accessToken>`
 *   test     — `GET /api/v0/tokeninfo`: the token's own staff member and
 *              deployment, never the token or the secret.
 */

interface AcceloCredential {
  deployment: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  accessToken: string;
  expiresAt: string;
}

interface TokenBody {
  access_token?: string;
  token_type?: string;
  expires_in?: string | number;
  error?: string;
  error_description?: string;
}

interface TokenInfo {
  response?: {
    email?: string;
    firstname?: string;
    surname?: string;
    deployment?: string;
    staff_id?: string | number;
  };
  meta?: { status?: string; message?: string };
}

const DEFAULT_SCOPE = "write(all)";

async function mintToken(
  ctx: HookContext,
  base: { deployment: string; clientId: string; clientSecret: string; scope: string },
): Promise<AcceloCredential> {
  const form = new URLSearchParams({ grant_type: "client_credentials", scope: base.scope });
  const res = await ctx.fetch(`${oauthBase(base.deployment)}/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      authorization: `Basic ${btoa(`${base.clientId}:${base.clientSecret}`)}`,
    },
    body: form.toString(),
  });
  const body = await res.json().catch(() => ({})) as TokenBody & TokenInfo;
  if (!res.ok || !body.access_token) {
    throw new Error(
      `Accelo token request failed (${res.status}): ${
        body.error_description ?? body.error ?? body.meta?.message ?? "no access_token in response"
      }`,
    );
  }
  const seconds = Number(body.expires_in);
  return {
    ...base,
    accessToken: body.access_token,
    // Trust the live `expires_in`; a minute of headroom absorbs clock skew. Accelo's
    // default is 30 days, so an unparsable value falls back to a conservative hour.
    expiresAt: new Date(Date.now() + ((Number.isFinite(seconds) ? seconds : 3600) - 60) * 1000)
      .toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Service Application (Client Credentials)",
  description:
    "Register a Service Application in Accelo under Configuration → API → Register Application, then paste its deployment, client id and client secret. No browser sign-in, so it works in scheduled runs.",
  connectionLabel: "{{user.name}} ({{deployment}})",
  fields: [
    {
      key: "deployment",
      label: "Deployment",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.api.accelo.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$" },
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "string",
      required: true,
      row: "client",
      placeholder: "abc123@acme.accelo.com",
    },
    { key: "clientSecret", label: "Client Secret", type: "secret", required: true, row: "client" },
    {
      key: "scope",
      label: "Scope",
      type: "string",
      default: DEFAULT_SCOPE,
      advanced: true,
      hint:
        "Accelo's own default is `read(all)`. `write(all)` reads and writes everything; narrow it as `read(all),write(companies,contacts)`.",
    },
  ],

  /** Turns the pasted deployment + client id/secret into a live bearer token. */
  exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    const deployment = normalizeDeployment(String(f.deployment ?? ""));
    const scope = String(f.scope ?? "").trim() || DEFAULT_SCOPE;
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    return mintToken(ctx, { deployment, clientId, clientSecret, scope });
  },

  /** Service applications have no refresh token — mint a new one. */
  refresh({ credential }, ctx) {
    const c = credential as Partial<AcceloCredential>;
    if (!c.deployment || !c.clientId || !c.clientSecret) {
      throw new Error("credential is missing deployment, clientId or clientSecret — reconnect");
    }
    return mintToken(ctx, {
      deployment: c.deployment,
      clientId: c.clientId,
      clientSecret: c.clientSecret,
      scope: c.scope || DEFAULT_SCOPE,
    });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as Partial<AcceloCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /api/v0/tokeninfo` is the probe, chosen by reading its body: it returns
   * the token owner's email, name, staff id and deployment — never the token or
   * the client secret — and it needs no resource scope, so a narrowly-scoped
   * credential is never reported broken for lacking access to some other resource.
   * The verdict comes from the body's `meta.status`, with the HTTP status as a hint.
   */
  async test({ credential }, ctx) {
    const c = credential as Partial<AcceloCredential>;
    if (!c.accessToken) return { ok: false, message: "credential missing an access token" };
    if (!c.deployment || !DEPLOYMENT_PATTERN.test(c.deployment)) {
      return { ok: false, message: "credential missing a valid deployment — reconnect" };
    }
    const res = await ctx.fetch(`${apiBase(c.deployment)}/tokeninfo`, {
      headers: { accept: "application/json", authorization: `Bearer ${c.accessToken}` },
    });
    const body = await res.json().catch(() => ({})) as TokenInfo;
    const status = body.meta?.status;
    if (res.ok && (status === undefined || status === "ok")) return { ok: true };
    const detail = body.meta?.message ? `: ${body.meta.message}` : "";
    if (res.status === 401 || status === "invalid_client") {
      return {
        ok: false,
        message:
          `Accelo rejected the token (401${detail}). It may have expired, or the API application was deleted or its secret rotated.`,
      };
    }
    if (res.status === 400) {
      return {
        ok: false,
        message: `Accelo could not use this deployment (400${detail}) — check the subdomain.`,
      };
    }
    return { ok: false, message: `Accelo returned ${res.status}${detail}` };
  },

  /** Records the deployment and the token's own staff member. Never the token. */
  async afterConnect({ credential }, ctx) {
    const c = credential as Partial<AcceloCredential>;
    if (!c.deployment) return {};
    if (!c.accessToken) return { deployment: c.deployment };
    try {
      const res = await ctx.fetch(`${apiBase(c.deployment)}/tokeninfo`, {
        headers: { accept: "application/json", authorization: `Bearer ${c.accessToken}` },
      });
      if (!res.ok) return { deployment: c.deployment };
      const body = await res.json().catch(() => ({})) as TokenInfo;
      const info = body.response;
      if (!info) return { deployment: c.deployment };
      const name = [info.firstname, info.surname].filter(Boolean).join(" ").trim();
      return {
        deployment: c.deployment,
        email: info.email,
        staffId: info.staff_id,
        user: { name: name || info.email || c.deployment, email: info.email },
      };
    } catch {
      return { deployment: c.deployment };
    }
  },

  /**
   * `POST /oauth2/v0/revoke` with the application's own Basic credentials and the
   * token to drop (documented under "Revoking a Token"). Best-effort: a failure
   * here must not stop a disconnect, so it is logged rather than thrown.
   */
  async revoke({ credential }, ctx) {
    const c = credential as Partial<AcceloCredential>;
    if (!c.deployment || !c.clientId || !c.clientSecret || !c.accessToken) return;
    try {
      const res = await ctx.fetch(`${oauthBase(c.deployment)}/revoke`, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${btoa(`${c.clientId}:${c.clientSecret}`)}`,
        },
        body: new URLSearchParams({ token: c.accessToken }).toString(),
      });
      if (!res.ok) ctx.log("warn", `Accelo token revoke returned ${res.status}`);
    } catch (err) {
      ctx.log("warn", `Accelo token revoke failed: ${String(err)}`);
    }
  },
};

export default clientCredentials;
