import type { HookContext } from "@w6w/types";
import { API_BASE, WHOAMI_PATH } from "../lib/client.ts";

/**
 * The credential probe and display-label lookup both auth methods (`oauth2.ts`,
 * `jwt-bearer.ts`) share.
 *
 * This lives in `auth/`, not `lib/`, because both functions stamp an
 * `Authorization` header — the sandbox audit (`_tools/audit.ts`,
 * `credentials/leak`) only allows that inside `auth/`, on the theory that only
 * the `sign` hook (and the auth-lifecycle hooks that run alongside it) may
 * touch a credential. `lib/client.ts`'s `RingCentralClient` deliberately never
 * sets this header itself — an Action's outbound requests get it from the
 * runtime's own `sign` routing, never from application code.
 */

interface RcErrorBody {
  errorCode?: string;
  message?: string;
}

/**
 * The credential-liveness probe both auth methods' `test` hooks share.
 *
 * Distinguishes the three cases actually observed on the wire (2026-08-15)
 * rather than collapsing them to a bare status code — see `lib/client.ts`'s
 * module doc for the full account.
 */
export async function probeCredential(
  ctx: HookContext,
  accessToken: string | undefined,
): Promise<{ ok: boolean; message?: string }> {
  const token = (accessToken ?? "").trim();
  if (!token) {
    return { ok: false, message: "credential has no accessToken — reconnect this connection" };
  }

  const res = await ctx.fetch(`${API_BASE}${WHOAMI_PATH}`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  if (res.ok) return { ok: true };

  const raw = await res.text().catch(() => "");
  let body: RcErrorBody | null = null;
  try {
    body = JSON.parse(raw) as RcErrorBody;
  } catch { /* not JSON */ }

  if (res.status === 401 && body?.errorCode === "AGW-401") {
    return {
      ok: false,
      message: "RingCentral received no Authorization header — the credential did not reach the " +
        "request. Reconnect this connection.",
    };
  }
  if (res.status === 401) {
    return {
      ok: false,
      message: `RingCentral rejected the access token (${res.status}${
        body?.errorCode ? ` ${body.errorCode}` : ""
      }). It may be expired or revoked — reconnect this connection.`,
    };
  }
  if (res.status === 403) {
    return {
      ok: false,
      message: `RingCentral refused the whoami read (403${
        body?.errorCode ? ` ${body.errorCode}` : ""
      })${
        body?.message ? `: ${body.message}` : ""
      }. The connected app or extension may be missing the "ReadAccounts" permission.`,
    };
  }
  return { ok: false, message: `RingCentral returned HTTP ${res.status} for ${WHOAMI_PATH}` };
}

/**
 * Publish the connected extension's name, number and account id for
 * `connectionLabel`, and nothing else.
 *
 * `GetExtensionInfoResponse` carries no secret, so nothing here needs
 * narrowing the way Apify's `/users/me` does — but it is still deliberately a
 * *reduced* projection: `contact` (email, phone numbers), `roles` and
 * `permissions` never leave this function, because a display label has no use
 * for them and every field kept here is one more thing a future edit could
 * accidentally start returning from an Action.
 *
 * A failure here is deliberately silent: `test` has already established the
 * token is live, and a missing display label must not fail a good Connection.
 */
export async function whoAmIDisplay(
  ctx: HookContext,
  accessToken: string | undefined,
): Promise<Record<string, unknown>> {
  const token = (accessToken ?? "").trim();
  if (!token) return {};
  try {
    const res = await ctx.fetch(`${API_BASE}${WHOAMI_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    const body = await res.json() as {
      name?: string;
      extensionNumber?: string;
      account?: { id?: string };
    };
    if (!body?.name) return {};
    return {
      name: body.name,
      extensionNumber: body.extensionNumber,
      accountId: body.account?.id,
    };
  } catch {
    return {};
  }
}
