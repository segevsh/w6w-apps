import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, WORKSPACE_ID_PATTERN } from "../lib/client.ts";

/**
 * Workspace API key — `Authorization: Bearer <key>`.
 *
 * Verified against the OpenAPI document's `securitySchemes` (`http`/`bearer`, format "API Key")
 * and live probes against `go.ninox.com` on 2026-10-06. A key is created under the Ninox app's
 * "Workspace Integration" settings, belongs to **one** workspace, and carries scopes (the
 * document names `records:write`, `schema:write` and `schema:manage-permissions`; an operation
 * the key lacks answers 403 `Insufficient API key scope`). The workspace id is a second
 * Connection field because every path starts with it.
 *
 * ## Credential probe
 *
 * `GET /workspace/{workspaceId}/modules?limit=1` — the module list: it needs the key, belongs to
 * the workspace the Connection names (so a right key with a wrong workspace id fails too), and
 * its body holds app structure, not credential material. Success is judged by the documented
 * shape (`data` is an array), never by a 200: an unknown path under `/api/v1` answers **200 with
 * the Ninox web-app HTML shell**.
 *
 * Measured, a missing key and a wrong key are byte-identical: `401 text/plain` with the body
 * `Workspace orchestrator error` — not the documented JSON error envelope — so `test` cannot
 * tell "the key never reached the request" from "the key is wrong" and reports both causes.
 */
export interface NinoxCredential {
  apiKey: string;
  workspaceId: string;
}

export const PROBE_PATH = "/modules";

function authHeaders(apiKey: string): Record<string, string> {
  return { authorization: `Bearer ${apiKey}` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "Workspace API Key",
  description: "A Workspace API key plus the id of the workspace it belongs to. Create the key " +
    "under Workspace Integration in the Ninox app; give it only the scopes the workflows need.",
  connectionLabel: "Ninox ({{workspaceId}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Ninox app > Workspace Integration. A key works for one workspace only.",
    },
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      placeholder: "abcdefghij12",
      validation: { pattern: "^[a-z0-9]{12}$" },
      hint: "The 12-character workspace id (lowercase letters and digits) that the key was " +
        "created in.",
    },
  ],

  /** The only hook handed the raw credential; network-less, it stamps the bearer header. */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<NinoxCredential>;
    request.headers["authorization"] = `Bearer ${apiKey ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<NinoxCredential>;
    const key = (cred?.apiKey ?? "").trim();
    const workspaceId = (cred?.workspaceId ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };
    if (!workspaceId) return { ok: false, message: "credential missing workspaceId" };
    if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
      return {
        ok: false,
        message: "workspaceId must be exactly 12 lowercase letters or digits",
      };
    }

    const res = await ctx.fetch(
      `${API_BASE}${API_PREFIX}/workspace/${encodeURIComponent(workspaceId)}${PROBE_PATH}?limit=1`,
      { headers: { accept: "application/json", ...authHeaders(key) } },
    );
    const text = await res.text();
    let body: { data?: unknown; error?: { message?: string } } | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }

    if (res.ok && Array.isArray(body?.data)) return { ok: true };
    if (res.status === 401) {
      return {
        ok: false,
        message: "Ninox rejected the request (401). A missing and a wrong API key are answered " +
          "identically, so check the key was copied exactly and has not been deleted under " +
          "Workspace Integration.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Ninox refused the module list (403${
          body?.error?.message ? `: ${body.error.message}` : ""
        }). The key lacks a scope or belongs to another workspace.`,
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `Ninox found no workspace ${workspaceId}${
          body?.error?.message ? ` (${body.error.message})` : ""
        }. Check the workspace id.`,
      };
    }
    if (res.ok) {
      return {
        ok: false,
        message: `HTTP ${res.status} from go.ninox.com was not a {"data": [...]} API response`,
      };
    }
    return { ok: false, message: `Ninox returned HTTP ${res.status} for the module list` };
  },

  /**
   * Publish the workspace id (where `lib/client.ts` reads it) and, when it can be read, the
   * workspace's name. Failure is silent: `test` has already proved the key.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<NinoxCredential>;
    const workspaceId = (cred?.workspaceId ?? "").trim();
    if (!workspaceId) return {};
    try {
      const res = await ctx.fetch(
        `${API_BASE}${API_PREFIX}/workspace/${encodeURIComponent(workspaceId)}`,
        { headers: { accept: "application/json", ...authHeaders(cred.apiKey ?? "") } },
      );
      if (!res.ok) return { workspaceId };
      const body = await res.json().catch(() => null) as { data?: { name?: string } } | null;
      const name = body?.data?.name;
      return name ? { workspaceId, workspaceName: name } : { workspaceId };
    } catch {
      return { workspaceId };
    }
  },
};

export default apiKey;
