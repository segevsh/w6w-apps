import type { HookContext } from "@w6w/types";
import { API_URL, TOKEN_URL } from "../lib/client.ts";

/**
 * Credential liveness, shared by both auth methods: `GET /quotas`.
 *
 * It is the one call that answers the three questions at once and returns
 * nothing secret — it needs only `accounts.read`, carries no credential in its
 * body (just per-feature `{limit, used}` counters), and its response headers
 * report the request quotas. The result is classified by the vendor's own
 * error envelope (`error.code`), not by the status line alone:
 *
 * - `401` → the token is bad or expired;
 * - `403` → the token authenticates but the client was never granted
 *   `accounts.read`. That is a working credential, so it is `ok` with a note —
 *   reporting it broken would blame the connection for a missing scope.
 */
export async function probeAccess(
  credential: unknown,
  ctx: HookContext,
): Promise<{ ok: boolean; message?: string }> {
  const { accessToken } = (credential ?? {}) as { accessToken?: string };
  if (!accessToken) return { ok: false, message: "credential has no accessToken — reconnect" };
  const res = await ctx.fetch(`${API_URL}/quotas`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
  });
  const body = await res.json().catch(() => null) as
    | { error?: { code?: number; message?: string } }
    | null;
  const code = body?.error?.code ?? res.status;
  if (res.ok) return { ok: true };
  if (code === 401) {
    return { ok: false, message: `Sellsy rejected the token: ${body?.error?.message ?? "401"}` };
  }
  if (code === 403) {
    return {
      ok: true,
      message: "token accepted; the client lacks `accounts.read`, so quotas cannot be read",
    };
  }
  return {
    ok: false,
    message: `Sellsy answered ${res.status}: ${body?.error?.message ?? ""}`.trim(),
  };
}

export interface TokenCredential {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  expiresAt: string;
}

/**
 * The client-credentials grant against `login.sellsy.com`. Note that the token
 * endpoint's errors are plain OAuth (`{"error": "invalid_client",
 * "error_description": …}`, verified 2026-10-06 with a bogus client), a
 * different shape from the API's `{"error": {code, message}}` envelope.
 */
export async function mintToken(
  ctx: HookContext,
  creds: { clientId: string; clientSecret: string },
): Promise<TokenCredential> {
  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });
  const body = await res.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    const reason = body.error_description ?? body.error ?? `HTTP ${res.status}`;
    throw new Error(
      `Sellsy refused to issue a token (${reason}). Use the client id and secret of a ` +
        "*personal* OAuth client — only personal clients may use client credentials.",
    );
  }
  return {
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    accessToken: body.access_token,
    // A minute of headroom absorbs clock skew.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
}
