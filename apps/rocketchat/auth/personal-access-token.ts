/**
 * Rocket.Chat Personal Access Token: `X-Auth-Token` + `X-User-Id` on every request, verified
 * against the `Auth-Token` / `UserId` header parameters every operation in the vendor's OpenAPI
 * documents shares (both `required: true`). A token without its user id is rejected.
 *
 * The workspace subdomain is a third field: Rocket.Chat Cloud hosts are `<name>.rocket.chat`
 * (see `lib/client.ts`). It is republished as `connection.display.workspace` by `afterConnect`
 * because actions never see the credential.
 *
 * `test` probes `GET /api/v1/me` — the caller's own profile, no scope or permission needed.
 * Its body carries the profile only, never the token. A rejected pair answers 401
 * `{"success": false, "status": "error", "message": "You must be logged in to do this."}`; the
 * verdict is read from that body and a `_id` in the answer, not from the status alone.
 */
import type { AuthDefinition } from "@w6w/types";
import { API_PATH, apiHost, errorMessage, normalizeWorkspace } from "../lib/client.ts";

interface Credential {
  workspace?: string;
  userId?: string;
  authToken?: string;
}

export function authHeaders(credential: Credential): Record<string, string> {
  return {
    "x-auth-token": String(credential?.authToken ?? "").trim(),
    "x-user-id": String(credential?.userId ?? "").trim(),
  };
}

function meUrl(workspace: unknown): string {
  return `https://${apiHost(workspace)}${API_PATH}/me`;
}

const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "custom",
  displayName: "Personal Access Token",
  description:
    "A Rocket.Chat Personal Access Token and the user id it was issued to, plus your Cloud " +
    "workspace name. Sent as `X-Auth-Token` and `X-User-Id`. Only Rocket.Chat Cloud " +
    "workspaces on `<name>.rocket.chat` are supported.",
  connectionLabel: "{{username}} @ {{workspace}}",
  fields: [
    {
      key: "workspace",
      label: "Workspace",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "The part before `.rocket.chat` in your workspace URL — `acme` for " +
        "`https://acme.rocket.chat`. Pasting the full URL also works.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "Shown beside the token when you create it (Profile > My Account > Personal Access " +
        "Tokens). It is the user's `_id`, not their username.",
    },
    {
      key: "authToken",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Profile > My Account > Personal Access Tokens > Add. Shown once. It carries YOUR " +
        "permissions. Create it with 'Ignore Two Factor Authentication' if the workflow runs " +
        "unattended on a user with 2FA.",
    },
  ],

  sign({ request, credential }) {
    return {
      ...request,
      headers: { ...request.headers, ...authHeaders(credential as Credential) },
    };
  },

  async test({ credential }, ctx) {
    const c = credential as Credential;
    const headers = authHeaders(c);
    if (!c?.workspace || !headers["x-auth-token"] || !headers["x-user-id"]) {
      return { ok: false, message: "credential needs a workspace, a user id and a token" };
    }
    let url: string;
    try {
      url = meUrl(c.workspace);
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
    const res = await ctx.fetch(url, { headers: { accept: "application/json", ...headers } });
    const body = await res.json().catch(() => null) as { _id?: string } | null;
    if (res.ok && body && typeof body._id === "string") return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Rocket.Chat rejected the token / user id pair: ${
          errorMessage(body) || `HTTP ${res.status}`
        }`,
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `No Rocket.Chat workspace answered at ${
          normalizeWorkspace(c.workspace)
        }.rocket.chat — check the workspace name.`,
      };
    }
    return { ok: false, message: errorMessage(body) || `Rocket.Chat returned HTTP ${res.status}` };
  },

  async afterConnect({ credential }, ctx) {
    const c = credential as Credential;
    const workspace = normalizeWorkspace(c?.workspace);
    const fallback = { workspace, username: String(c?.userId ?? "") };
    let url: string;
    try {
      url = meUrl(c?.workspace);
    } catch {
      return fallback;
    }
    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", ...authHeaders(c) },
    });
    if (!res.ok) return fallback;
    const body = await res.json().catch(() => null) as { username?: string; name?: string } | null;
    return { workspace, username: body?.username ?? fallback.username, name: body?.name ?? "" };
  },
};

export default personalAccessToken;
