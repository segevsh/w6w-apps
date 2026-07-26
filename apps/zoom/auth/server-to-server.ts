import type { AuthDefinition } from "@w6w/types";
import { API_URL, OAUTH_TOKEN_URL } from "../lib/client.ts";

/**
 * Server-to-Server OAuth (`custom`).
 *
 * This is the successor to Zoom's JWT app type, which Zoom retired in 2023 —
 * n8n's `ZoomApi` credential is still the JWT one and no longer works, so this
 * port does not carry it over.
 *
 * It is the `account_credentials` grant: there is no browser round-trip, so it
 * works in background and scheduled runs. The three values the user pastes are
 * long-lived; the access token they mint is not (one hour), which is what the
 * `exchange` and `refresh` hooks are for:
 *
 *   exchange  — form values -> a live token, at connect time
 *   refresh   — the same call again, when the runtime sees the token expire
 *   sign      — stamps the current token on each request
 *
 * The client id/secret are kept in the stored credential precisely because
 * `refresh` needs them, and `refresh` — like `sign` — is credential-side code.
 */
async function mintToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  creds: { accountId: string; clientId: string; clientSecret: string },
): Promise<Record<string, unknown>> {
  const url = new URL(OAUTH_TOKEN_URL);
  url.searchParams.set("grant_type", "account_credentials");
  url.searchParams.set("account_id", creds.accountId);

  const res = await ctx.fetch(url.toString(), {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
  });
  const body = await res.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    reason?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(`Zoom token request failed (${res.status}): ${body.reason ?? "no token"}`);
  }
  return {
    ...creds,
    accessToken: body.access_token,
    // Recorded so the host can refresh before Zoom rejects the token. Zoom's
    // tokens last an hour; the minute of headroom absorbs clock skew.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
}

const serverToServer: AuthDefinition = {
  key: "server-to-server",
  type: "custom",
  displayName: "Server-to-Server OAuth",
  description:
    "Create a Server-to-Server OAuth app at marketplace.zoom.us, then paste its Account ID, Client ID and Client Secret. No browser sign-in, so it works in scheduled runs.",
  connectionLabel: "{{user.email}}",
  fields: [
    {
      key: "accountId",
      label: "Account ID",
      type: "secret",
      required: true,
      hint: "App Credentials tab of your Server-to-Server OAuth app.",
    },
    { key: "clientId", label: "Client ID", type: "secret", required: true, row: "client" },
    { key: "clientSecret", label: "Client Secret", type: "secret", required: true, row: "client" },
  ],

  /** Turns the three pasted values into a live token at connect time. */
  exchange({ fields }, ctx) {
    const { accountId, clientId, clientSecret } = (fields ?? {}) as Record<string, string>;
    if (!accountId || !clientId || !clientSecret) {
      throw new Error("Account ID, Client ID and Client Secret are all required.");
    }
    return mintToken(ctx, { accountId, clientId, clientSecret });
  },

  /** Same call again — the account credentials never expire, only the token does. */
  refresh({ credential }, ctx) {
    const { accountId, clientId, clientSecret } = credential as Record<string, string>;
    return mintToken(ctx, { accountId, clientId, clientSecret });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential has no accessToken — reconnect" };
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      return { ok: false, message: body.message ?? `Zoom returned ${res.status}` };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`);
    if (!res.ok) return {};
    const me = await res.json().catch(() => ({})) as {
      id?: string;
      email?: string;
      first_name?: string;
      account_id?: string;
    };
    return {
      user: { id: me.id, email: me.email, name: me.first_name },
      account: { id: me.account_id },
    };
  },
};

export default serverToServer;
