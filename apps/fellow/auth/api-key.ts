import type { AuthDefinition } from "@w6w/types";
import { API_PATH, apiHost, describeError, normalizeSubdomain } from "../lib/client.ts";

/**
 * Fellow Developer API key — `X-API-KEY: <key>`.
 *
 * Verified 2026-10-05: the OpenAPI document's only security scheme is
 * `DeveloperAPIKeyAuth` (`apiKey`, `in: header`, `name: X-API-KEY`), and the
 * Authentication page says the same. (The Super Admin page's code samples write
 * `Authorization: ApiKey …`; that is a doc inconsistency, and the header this
 * app sends is the one the schema and the Authentication page both name.)
 *
 * The key is per **user** and inherits that user's access, and a workspace
 * admin must enable the Developer API in Workspace Settings > Security before
 * the key section even appears. A **Super Admin** key (Enterprise) additionally
 * unlocks the two delete endpoints, workspace-wide reads and workspace-scoped
 * webhooks.
 *
 * ## The probe
 *
 * `GET /api/v1/me` — it needs the key (unauthenticated: `401 {"detail":
 * "Unauthorized"}`, observed live), needs no extra permission, and returns the
 * caller's id, email, full name and the workspace — never the key itself. It is
 * judged on the response **body** (`user.id` present), not on a status code.
 */

export interface FellowCredential {
  subdomain?: string;
  apiKey?: string;
}

export function authHeaders(credential: Partial<FellowCredential>): Record<string, string> {
  return { "x-api-key": (credential.apiKey ?? "").trim() };
}

export const PROBE_PATH = "/me";

interface MeBody {
  user?: { id?: string; email?: string; full_name?: string };
  workspace?: { id?: string; name?: string; subdomain?: string };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Developer API Key",
  apiKey: { in: "header", name: "X-API-KEY" },
  description:
    "Your Fellow workspace subdomain and a Developer API key from User settings > Developer " +
    "API. The key carries your own access in Fellow; a Super Admin key is needed for deletes " +
    "and workspace-wide reads.",
  connectionLabel: "{{workspaceName}} ({{email}})",
  fields: [
    {
      key: "subdomain",
      label: "Workspace subdomain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "The part before `.fellow.app` in your Fellow URL — `acme` for " +
        "`https://acme.fellow.app`. Pasting the full host or URL also works.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Fellow > User settings > Developer API > generate a key (shown only once). If the " +
        "section is missing, a workspace admin must enable the Developer API under Workspace " +
        "settings > Security first.",
    },
  ],

  sign({ request, credential }) {
    for (const [name, value] of Object.entries(authHeaders(credential as FellowCredential))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const { subdomain, apiKey: key } = credential as FellowCredential;
    if (!subdomain || !key) return { ok: false, message: "credential missing subdomain / apiKey" };

    let url: string;
    try {
      url = `https://${apiHost(subdomain)}${API_PATH}${PROBE_PATH}`;
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }

    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text().catch(() => "");
    let body: MeBody | null = null;
    try {
      body = JSON.parse(text) as MeBody;
    } catch { /* not JSON — handled below */ }

    if (res.ok && body?.user?.id) return { ok: true };

    if (res.status === 404 || (res.ok && !body)) {
      return {
        ok: false,
        message: `No Fellow workspace answered at ${normalizeSubdomain(subdomain)}.fellow.app — ` +
          "check the workspace subdomain.",
      };
    }
    if (res.ok) return { ok: false, message: "Fellow answered, but not with the /me shape." };
    return { ok: false, message: describeError(res.status, text) };
  },

  async afterConnect({ credential }, ctx) {
    const { subdomain, apiKey: key } = credential as FellowCredential;
    const normalized = normalizeSubdomain(subdomain ?? "");
    const fallback = { subdomain: normalized, workspaceName: normalized, email: "" };
    try {
      const res = await ctx.fetch(`https://${apiHost(subdomain ?? "")}${API_PATH}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
      });
      if (!res.ok) return fallback;
      const body = await res.json() as MeBody;
      return {
        subdomain: normalized,
        workspaceName: body.workspace?.name ?? normalized,
        email: body.user?.email ?? "",
        userName: body.user?.full_name ?? "",
      };
    } catch {
      return fallback;
    }
  },
};

export default apiKey;
