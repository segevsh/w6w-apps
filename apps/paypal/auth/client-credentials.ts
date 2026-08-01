import type { AuthDefinition } from "@w6w/types";
import { API_URL_LIVE, API_URL_SANDBOX, TOKEN_PATH } from "../lib/client.ts";

/**
 * OAuth2 Client Credentials (`custom`).
 *
 * PayPal has no per-user OAuth code flow for the REST APIs this app covers —
 * a "REST API app" registered at developer.paypal.com/dashboard/applications
 * yields a Client ID + Secret, and every call is authorized as that app via
 * the `client_credentials` grant: `POST /v1/oauth2/token` with HTTP Basic
 * `clientId:clientSecret` and `grant_type=client_credentials` in the body. No
 * browser round-trip, so — like Zoom's Server-to-Server pattern this is
 * modelled on — it keeps working in scheduled and background runs.
 *
 * `type: "custom"` rather than `"oauth2"`: the `oauth2` type in this spec
 * models the browser authorization-code flow (`authorizationUrl` +
 * PKCE); this is the machine-to-machine grant, same shape as Zoom's
 * `server-to-server` auth method.
 *
 *   exchange  — form values (clientId, clientSecret, sandbox) -> a live token
 *   refresh   — the same call again, when the runtime sees the token expire
 *   sign      — stamps the current token on each request
 *   afterConnect — echoes `sandbox` onto the Connection's `display`, so
 *                  `lib/client.ts` can pick the right host without ever
 *                  seeing the credential (see `PayPalClient`).
 *
 * The client id/secret are kept in the stored credential precisely because
 * `refresh` (and `test`, which re-runs the same exchange) need them.
 */
async function mintToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  creds: { clientId: string; clientSecret: string; sandbox: boolean },
): Promise<Record<string, unknown>> {
  const base = creds.sandbox ? API_URL_SANDBOX : API_URL_LIVE;
  const res = await ctx.fetch(`${base}${TOKEN_PATH}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = await res.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(
      `PayPal token request failed (${res.status}): ${
        body.error_description ?? body.error ?? "no token"
      }`,
    );
  }
  return {
    ...creds,
    accessToken: body.access_token,
    // Recorded so the host can refresh before PayPal rejects the token.
    // PayPal's client-credentials tokens typically last 9 hours (32000s); the
    // minute of headroom absorbs clock skew regardless of the actual TTL.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 32000) - 60) * 1000).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Client Credentials",
  description:
    "Create a REST API app at developer.paypal.com/dashboard/applications, then paste its " +
    "Client ID and Secret. No browser sign-in, so it works in scheduled runs.",
  connectionLabel: "{{environment}}",
  fields: [
    { key: "clientId", label: "Client ID", type: "secret", required: true, row: "client" },
    { key: "clientSecret", label: "Client Secret", type: "secret", required: true, row: "client" },
    {
      key: "sandbox",
      label: "Use Sandbox",
      type: "boolean",
      default: false,
      hint: "Test against api-m.sandbox.paypal.com with a Sandbox app's credentials, " +
        "instead of the live API.",
    },
  ],

  /** Turns the pasted values into a live token at connect time. */
  exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    return mintToken(ctx, { clientId, clientSecret, sandbox: f.sandbox === true });
  },

  /** Same call again — the client id/secret never expire, only the token does. */
  refresh({ credential }, ctx) {
    const { clientId, clientSecret, sandbox } = credential as {
      clientId: string;
      clientSecret: string;
      sandbox?: boolean;
    };
    return mintToken(ctx, { clientId, clientSecret, sandbox: sandbox === true });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * Re-runs the exact same client-credentials exchange PayPal's own
   * dashboard credential test performs — the safest liveness probe for an
   * app-level token, since it needs no scope beyond what every REST API app
   * already carries.
   */
  async test({ credential }, ctx) {
    const { clientId, clientSecret, sandbox } = credential as {
      clientId?: string;
      clientSecret?: string;
      sandbox?: boolean;
    };
    if (!clientId || !clientSecret) {
      return { ok: false, message: "credential missing clientId or clientSecret — reconnect" };
    }
    try {
      await mintToken(ctx, { clientId, clientSecret, sandbox: sandbox === true });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },

  /** Records the environment on the connection so the client can pick the right host. */
  afterConnect({ credential }, _ctx) {
    const { sandbox } = credential as { sandbox?: boolean };
    return { sandbox: sandbox === true, environment: sandbox === true ? "Sandbox" : "Live" };
  },
};

export default clientCredentials;
