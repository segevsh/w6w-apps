import type { AuthDefinition } from "@w6w/types";
import { API_URL, errorMessage } from "../lib/client.ts";

/**
 * API Key + Username + Password, exchanged once for a Redtail `user_key`.
 *
 * ## Why this is `custom` and not `basic`
 *
 * Redtail's `GET /authentication` (verified against the vendor's own Postman
 * collection — see `lib/client.ts`) takes `Authorization: Basic
 * base64(APIKey:Username:Password)` — a THREE-part Basic credential, not the
 * two-part username/password `type: "basic"` models — and returns
 * `{redtail_database_id, redtail_user_id, user_key}`. Every other endpoint is
 * then signed with a *different* header scheme built from that response:
 * `Authorization: UserKeyAuth base64(APIKey:UserKey)`. The credential the user
 * types is therefore not the credential that signs requests, so this is
 * `custom` with an `exchange` hook — the same shape AgencyZoom's
 * `auth/login.ts` uses for its own login-then-JWT exchange.
 *
 * ## There is no documented refresh, and no documented expiry
 *
 * Nothing in the collection names a `user_key` TTL, a refresh endpoint, or a
 * revoke endpoint. `refresh` below does the only thing available: it re-runs
 * the same `/authentication` exchange with the stored API key, username and
 * password — which is why those are kept in the credential rather than
 * discarded after `exchange`, mirroring AgencyZoom's `login.ts` for the same
 * reason. There is likewise no `revoke` hook: nothing in the API accepts a
 * `user_key` to invalidate it.
 *
 * ## The API Key is account-level, not per-user
 *
 * Redtail issues one API Key per Redtail Technology partner account (obtained
 * by contacting Redtail); Username/Password authenticate a specific Redtail
 * CRM user within that database. The resulting `user_key` and every
 * subsequent call therefore act as that specific user, with that user's own
 * permissions — a 403 `{"message": "User Forbidden from ..."}` is a
 * documented, live-observed response shape for a field a caller's Redtail
 * user role can't touch.
 */
export interface RedtailCredential {
  apiKey: string;
  username: string;
  password: string;
  userKey: string;
  databaseId?: number;
  userId?: number;
}

interface AuthenticationResponse {
  redtail_database_id?: number;
  redtail_user_id?: number;
  user_key?: string;
}

/** `Authorization: UserKeyAuth base64(APIKey:UserKey)` — every endpoint but `/authentication` itself. */
export function userKeyAuthHeader(apiKey: string, userKey: string): string {
  return `UserKeyAuth ${btoa(`${apiKey}:${userKey}`)}`;
}

/**
 * `GET /authentication` with `Authorization: Basic base64(APIKey:Username:Password)`.
 * Shared by `exchange` and `refresh` — both spend the same one call.
 */
async function authenticate(
  apiKey: string,
  username: string,
  password: string,
  ctx: { fetch: typeof fetch },
): Promise<RedtailCredential> {
  const res = await ctx.fetch(`${API_URL}/authentication`, {
    headers: {
      accept: "application/json",
      authorization: `Basic ${btoa(`${apiKey}:${username}:${password}`)}`,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    const detail = errorMessage(text);
    throw new Error(
      `Redtail authentication failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  const body = (text ? JSON.parse(text) : {}) as AuthenticationResponse;
  if (!body.user_key) throw new Error("Redtail authentication succeeded but returned no user_key");
  return {
    apiKey,
    username,
    password,
    userKey: body.user_key,
    databaseId: body.redtail_database_id,
    userId: body.redtail_user_id,
  };
}

const databaseCredentials: AuthDefinition = {
  key: "database-credentials",
  type: "custom",
  displayName: "API Key, Username & Password",
  description:
    "The API Key is issued per Redtail Technology account (contact Redtail to obtain one). " +
    "Username and Password are a Redtail CRM user's own login for the database you want to connect.",
  connectionLabel: "Redtail ({{username}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Issued by Redtail Technology for your account.",
    },
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      hint: "The Redtail CRM user this connection acts as.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      required: true,
    },
  ],

  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const apiKey = String(f.apiKey ?? "").trim();
    const username = String(f.username ?? "").trim();
    const password = String(f.password ?? "");
    if (!apiKey) throw new Error("`apiKey` is required");
    if (!username) throw new Error("`username` is required");
    if (!password) throw new Error("`password` is required");
    return await authenticate(apiKey, username, password, ctx);
  },

  sign({ request, credential }) {
    const { apiKey, userKey } = credential as Partial<RedtailCredential>;
    if (apiKey && userKey) {
      request.headers["authorization"] = userKeyAuthHeader(apiKey, userKey);
    }
    return request;
  },

  /** No refresh endpoint exists — re-run the `/authentication` exchange. */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<RedtailCredential>;
    const apiKey = String(cred.apiKey ?? "");
    const username = String(cred.username ?? "");
    const password = String(cred.password ?? "");
    if (!apiKey || !username || !password) {
      throw new Error("credential missing apiKey/username/password — reconnect the account");
    }
    return await authenticate(apiKey, username, password, ctx);
  },

  /**
   * `GET /contacts?page=1` — a cheap, already-paged read that needs a live
   * `user_key` to succeed and never echoes any credential material back (the
   * response is a page of contact records, not a whoami/apikey dump).
   */
  async test({ credential }, ctx) {
    const { apiKey, userKey } = (credential ?? {}) as Partial<RedtailCredential>;
    if (!apiKey || !userKey) {
      return { ok: false, message: "credential missing apiKey/userKey — reconnect the account" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/contacts?page=1`, {
        headers: { accept: "application/json", authorization: userKeyAuthHeader(apiKey, userKey) },
      });
    } catch (err) {
      return { ok: false, message: `could not reach Redtail: ${String(err)}` };
    }
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: `Redtail rejected the credential (401${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }). The user_key may have been revoked — reconnect the account.`,
      };
    }
    return {
      ok: false,
      message: `Redtail returned ${res.status}${
        errorMessage(text) ? `: ${errorMessage(text)}` : ""
      }.`,
    };
  },

  /** `GET /lists/database_users/{user_id}` — the connected user's own display name. */
  async afterConnect({ credential }, ctx) {
    const { apiKey, userKey, userId } = (credential ?? {}) as Partial<RedtailCredential>;
    if (!apiKey || !userKey || !userId) return {};
    try {
      const res = await ctx.fetch(`${API_URL}/lists/database_users/${userId}`, {
        headers: { accept: "application/json", authorization: userKeyAuthHeader(apiKey, userKey) },
      });
      if (!res.ok) return {};
      const body = await res.json().catch(() => null) as {
        database_users?: { first_name?: string; last_name?: string };
      } | null;
      const u = body?.database_users;
      if (!u) return {};
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
      return name ? { name } : {};
    } catch {
      return {};
    }
  },
  // No `revoke`: nothing in the API accepts a user_key to invalidate it.
};

export default databaseCredentials;
