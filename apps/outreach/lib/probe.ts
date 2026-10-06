import type { HookContext } from "@w6w/types";
import { API_ROOT, type ErrorBody, errorCode, MEDIA_TYPE } from "./client.ts";

/**
 * The credential probe: one-record read of `/users`, no attributes requested
 * (`fields[user]=` empty returns only type and id — nothing personal), counting
 * switched off.
 *
 * Why this and not the API root (`GET /api/v2`): the docs say the root returns
 * "information about your current OAuth application and token", and its body is
 * not in the OpenAPI document, so it cannot be shown not to echo the token.
 * Why `/users` is safe as a probe even for a token without `users.read`: Outreach
 * checks the token first and the scope second, so a scope refusal (403
 * `unauthorizedOauthScope`) PROVES the token is live — see `classifyProbe`.
 */
export const PROBE_URL = `${API_ROOT}/users?page[size]=1&count=false&fields[user]=`;

export interface ProbeVerdict {
  ok: boolean;
  message?: string;
}

/**
 * Decide from the response BODY, not the status alone. Outreach answers 401 in
 * two shapes (JSON:API `errors[]`, or the gateway's bare `{error, description}`)
 * and 403 for two unrelated reasons (missing OAuth scope, missing governance
 * permission) — both of which mean the token itself authenticated.
 */
export function classifyProbe(status: number, body: ErrorBody | null): ProbeVerdict {
  if (status >= 200 && status < 300) return { ok: true };
  const code = errorCode(body);
  if (status === 403 && (code === "unauthorizedOauthScope" || code === "unauthorizedRequest")) {
    return {
      ok: true,
      message: code === "unauthorizedOauthScope"
        ? "Token is valid but this connection lacks the users.read scope; actions need their own scopes."
        : "Token is valid; the user lacks governance permission to list users.",
    };
  }
  if (status === 429 || code === "rateLimitExceeded") {
    return { ok: true, message: "Token accepted; Outreach is rate limiting this user." };
  }
  if (status === 401) {
    const why = body?.error ?? body?.errors?.[0]?.detail ?? body?.errors?.[0]?.title;
    return {
      ok: false,
      message: `Outreach rejected the access token (401${
        why ? `: ${why}` : ""
      }). Reconnect Outreach.`,
    };
  }
  if (status === 503 || code === "scheduledServerMaintenance") {
    return {
      ok: false,
      message: "Outreach is in scheduled maintenance; the credential could not be verified.",
    };
  }
  return { ok: false, message: `Outreach returned HTTP ${status} for the credential probe.` };
}

/**
 * One probe request. `extraHeaders` is how `auth.test` — the only place allowed
 * to hold a credential — supplies its token; a health check passes none and lets
 * `sign` do it.
 */
export async function runProbe(
  ctx: HookContext,
  extraHeaders: Record<string, string> = {},
): Promise<{ response: Response; body: ErrorBody | null }> {
  const headers: Record<string, string> = {
    "content-type": MEDIA_TYPE,
    accept: MEDIA_TYPE,
    ...extraHeaders,
  };
  const response = await ctx.fetch(PROBE_URL, { headers });
  const text = await response.text();
  let body: ErrorBody | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { response, body };
}
