import type { HookContext } from "@w6w/types";
import { API_BASE, asTwistError } from "../lib/client.ts";
import { bearer } from "./headers.ts";

/**
 * The credential-liveness probe both auth methods share: `GET /api/v3/workspaces/get`.
 *
 * ## Why not the whoami
 *
 * `GET /api/v3/users/get_session_user` is the obvious "who am I" call and it is the wrong probe:
 * the User object it returns carries a `token` field — "The user's API token" — so every check
 * would copy a live credential into the health surface. (`POST /users/update` and
 * `POST /users/invalidate_token` return the same object; the `user-get-current` and
 * `user-update` actions delete the field before returning.)
 *
 * `workspaces/get` lists the caller's workspaces: it requires a credential, returns names and
 * ids only, and needs the `workspaces:read` scope, which any usable integration holds.
 *
 * ## Classification is by body, never by status
 *
 * Measured live on 2026-10-06, a missing token and an invalid token are the same answer —
 * `403 {"error_code":200,"error_string":"Invalid token"}` — and Twist's own docs map the same
 * 401 "Access Denied" to error 120 elsewhere. So the verdict comes from `error_code`:
 *   - 200 / 120      -> the credential is not accepted
 *   - 109 (Forbidden) -> the credential WAS recognised and the scope was refused: live
 *   - an array body   -> live
 */
export async function probe(
  token: string | undefined,
  ctx: HookContext,
): Promise<{ ok: boolean; message?: string }> {
  const value = (token ?? "").trim();
  if (!value) return { ok: false, message: "credential missing token" };

  const res = await ctx.fetch(`${API_BASE}/api/v3/workspaces/get`, {
    headers: { accept: "application/json", ...bearer(value) },
  });
  const body = await res.json().catch(() => undefined);
  if (res.ok && Array.isArray(body)) return { ok: true };

  const err = asTwistError(body);
  if (err?.error_code === 200 || err?.error_code === 120) {
    return {
      ok: false,
      message: `Twist rejected the token (error ${err.error_code}: ${err.error_string}). ` +
        "Check it was copied exactly and has not been revoked.",
    };
  }
  if (err?.error_code === 109) {
    return {
      ok: true,
      message: "Token accepted, but it lacks the workspaces:read scope; some actions will be " +
        "refused until it is granted.",
    };
  }
  if (err) {
    return {
      ok: false,
      message: `Twist error ${err.error_code ?? err.error}: ${
        err.error_string ?? err.error_message
      } (HTTP ${res.status})`,
    };
  }
  return { ok: false, message: `Twist returned an unexpected response (HTTP ${res.status})` };
}

/**
 * Publish the account's display name and id, and nothing else. `GET /users/get_session_user`
 * returns the user's API token, so this takes exactly two fields off the response and drops
 * the rest. Silent on failure: `test` has already proved the credential, and a missing label
 * must not fail a good connection.
 */
export async function whoLabel(
  token: string | undefined,
  ctx: HookContext,
): Promise<Record<string, unknown>> {
  try {
    const res = await ctx.fetch(`${API_BASE}/api/v3/users/get_session_user`, {
      headers: { accept: "application/json", ...bearer(token) },
    });
    if (!res.ok) return {};
    const body = await res.json() as { id?: number; name?: string };
    if (typeof body?.name !== "string") return {};
    return typeof body.id === "number" ? { name: body.name, userId: body.id } : { name: body.name };
  } catch {
    return {};
  }
}
