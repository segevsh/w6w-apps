import type { AuthDefinition } from "@w6w/types";
import { CLOUD_HOST, describeError, normalizeHost } from "../lib/client.ts";

/**
 * An Airbyte **application** — a client id and secret that mint short-lived
 * access tokens.
 *
 * ## The token lasts three minutes, so the credential is the application
 *
 * Airbyte's own guidance is to fetch a new token "before each request". This
 * connection therefore stores the client id and secret and lets the runtime's
 * refresh mint tokens, rather than storing a token that would be stale before
 * a workflow's second step.
 *
 * `expiresAt` is deliberately set a little short of the reported lifetime, so
 * a refresh happens before a request rather than after a 401.
 *
 * ## An application is a person's permissions, not a service account's
 *
 * Airbyte's documentation: "the user you're logged in as when you create an
 * Application dictates what permissions you'll have". So a workflow reaches
 * exactly what its creator reaches, and loses that access when they do.
 *
 * ## A failed token request says nothing
 *
 * Verified live: a wrong client id and secret return **401 with a body of
 * `{"errorId":"…"}`** — no message, no code, nothing but a uuid to quote at
 * support. So this hook says what the likely causes are, since the response
 * will not.
 */
const auth: AuthDefinition = {
  key: "application",
  type: "custom",
  displayName: "Application (client credentials)",
  connectionLabel: "{{hostLabel}}",
  description:
    "An Airbyte application's client id and secret. Access tokens last THREE MINUTES — Airbyte " +
    "advises fetching one per request — so the connection stores the application and mints " +
    "tokens as it goes. An application carries the permissions of the user who made it.",
  fields: [
    {
      key: "host",
      label: "Host",
      type: "string",
      default: CLOUD_HOST,
      hint: "Airbyte Cloud is `https://api.airbyte.com`. A self-hosted deployment is its own " +
        "URL — and note that with authentication disabled, a self-hosted Airbyte answers to " +
        "anybody who can reach it.",
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "string",
      required: true,
      hint: "Settings → Account → Applications.",
    },
    {
      key: "clientSecret",
      label: "Client secret",
      type: "secret",
      required: true,
    },
  ],

  async exchange({ fields }, ctx) {
    const values = fields as Record<string, unknown>;
    const host = normalizeHost(values?.host);
    const clientId = String(values?.clientId ?? "").trim();
    const clientSecret = String(values?.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("`clientId` and `clientSecret` are both required");
    }

    const token = await mint(host, clientId, clientSecret, ctx.fetch);
    return { host, clientId, clientSecret, ...token };
  },

  async refresh({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const host = String(fields?.host ?? CLOUD_HOST);
    const token = await mint(
      host,
      String(fields?.clientId ?? ""),
      String(fields?.clientSecret ?? ""),
      ctx.fetch,
    );
    return { ...fields, ...token };
  },

  sign({ request, credential }) {
    const accessToken = String((credential as Record<string, unknown>)?.accessToken ?? "");
    return {
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${accessToken}` },
    };
  },

  async test({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const host = String(fields?.host ?? CLOUD_HOST);

    let res: Response;
    try {
      res = await ctx.fetch(`${host}/v1/workspaces?limit=1`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    let workspaces: unknown[] = [];
    try {
      workspaces = (JSON.parse(text) as { data?: unknown[] })?.data ?? [];
    } catch { /* an unexpected shape is still an authenticated call */ }

    return {
      ok: true,
      message: `reached ${new URL(host).host} — ${workspaces.length ? "at least one" : "no"} ` +
        "workspace visible to this application. Its access is the access of the user who " +
        "created it, and its tokens expire after three minutes",
    };
  },

  afterConnect({ credential }) {
    const fields = credential as Record<string, unknown>;
    const host = String(fields?.host ?? CLOUD_HOST);
    return {
      host,
      hostLabel: host === CLOUD_HOST ? "Airbyte Cloud" : new URL(host).host,
      clientId: String(fields?.clientId ?? ""),
      deployment: host === CLOUD_HOST ? "cloud" : "self-managed",
    };
  },
};

/**
 * `POST /v1/applications/token`.
 *
 * The schema names its fields `client_id` and `client_secret` and the grant
 * `grant-type` — with a hyphen, unlike every other OAuth-shaped API. Both are
 * sent as documented.
 */
async function mint(
  host: string,
  clientId: string,
  clientSecret: string,
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>,
): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetchImpl(`${host}/v1/applications/token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      "grant-type": "client_credentials",
    }),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `Airbyte ${res.status} minting an access token: ${describeError(res.status, text)}`,
    );
  }

  interface TokenResponse {
    access_token?: string;
    expires_in?: number;
  }
  let token: TokenResponse;
  try {
    token = JSON.parse(text) as TokenResponse;
  } catch {
    throw new Error(`Airbyte did not return a token: ${text.slice(0, 160)}`);
  }
  if (!token.access_token) {
    throw new Error("Airbyte returned no `access_token` for this application");
  }

  // Three minutes on Cloud. Expire a little early so a refresh happens before
  // a request rather than after a 401.
  const seconds = Number(token.expires_in ?? 180) || 180;
  const early = Math.max(30, seconds - 30);
  return {
    accessToken: token.access_token,
    expiresAt: new Date(Date.now() + early * 1000).toISOString(),
  };
}

export default auth;
