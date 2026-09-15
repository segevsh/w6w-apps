import type { AuthDefinition } from "@w6w/types";
import { formatSoftrError, TABLES_API_BASE } from "../lib/client.ts";

/**
 * Softr Personal Access Token — `Softr-Api-Key: <token>` header.
 *
 * Verified against `docs.softr.io/softr-api/softr-database-api/authorisation/index`
 * (the Database API's own "Authorisation" page) and
 * `docs.softr.io/softr-api/api-setup-and-endpoints` (the Studio Users API's
 * setup guide) on 2026-09-15. Both describe the exact same token, generated
 * the exact same way — Softr Dashboard → workspace → API tokens — passed in
 * the exact same header name. This app declares one Auth method for both
 * hosts; `sign` stamps the header regardless of which client issued the
 * request.
 *
 * ## Scoping
 *
 * Per the Authorisation page: "Tokens are scoped to one or more workspaces...
 * The token inherits the access rights of the user who created it... We
 * currently support Personal Access Tokens only." There is no narrower,
 * resource-level scope documented (unlike, say, Apify's Actor-scoped tokens),
 * so the credential probe below only needs to prove the token is live and
 * reaches at least one workspace — not that it reaches a specific database.
 */
export interface SoftrCredential {
  apiKey: string;
}

/** The one place the wire format is built, reused by `sign` and `test`. */
export function authHeaders(credential: Partial<SoftrCredential>): Record<string, string> {
  return { "softr-api-key": credential.apiKey ?? "" };
}

/**
 * The credential-liveness probe: `GET /databases`.
 *
 * Chosen because it is the cheapest read Softr documents at all — no `/me` or
 * `/whoami` endpoint exists on either host — it requires the credential (an
 * unauthenticated call cannot succeed, since a token is the only thing that
 * identifies a workspace), and its response (`id`, `name`, `description`,
 * `workspaceId`, `tablesCount`, timestamps) carries no credential material.
 * It is also useful on its own merits: a workflow builder picking a database
 * needs this list regardless, so the probe and the `database-list` Action
 * share one code path.
 */
export const PROBE_PATH = "/databases";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Personal Access Token",
  description: "Paste a Personal Access Token from your Softr workspace's API tokens page " +
    "(Dashboard > workspace name > API tokens). Scope it to the workspace(s) this connection " +
    "needs.",
  apiKey: { in: "header", name: "Softr-Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Softr Dashboard > your workspace (top-left) > API tokens > Create.",
    },
  ],

  /** The only hook handed the raw credential; runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<SoftrCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH}. Reads the vendor's own error body — never the bare status alone. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<SoftrCredential>;
    const token = (cred?.apiKey ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${TABLES_API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: token }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    return { ok: false, message: formatSoftrError(res.status, "GET", PROBE_PATH, raw) };
  },
};

export default apiKey;
