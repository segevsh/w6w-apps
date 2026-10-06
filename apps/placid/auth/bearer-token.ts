import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

/**
 * Placid API token — `Authorization: Bearer {TOKEN}` (REST v2.0 Authentication page,
 * verified 2026-10-06). Tokens are PROJECT-specific: one token addresses one project's
 * templates, so a connection is a project.
 */
export interface PlacidCredential {
  apiToken: string;
}

export function authHeaders(credential: Partial<PlacidCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/**
 * The credential probe: `GET /templates`.
 *
 * Placid has no whoami, account or ping endpoint (the reference lists none), so the probe is
 * the cheapest read that every project token can make. It returns template metadata only,
 * never the token. The verdict comes from the BODY, not the status: a live token answers a
 * `{data: [...], links, meta}` envelope; a bad or missing one answers Laravel's
 * `{"message":"Unauthenticated."}` (measured live 2026-10-06, byte-identical for a missing
 * and a bogus token). Anything else is reported verbatim as unknown trouble.
 */
export const PROBE_PATH = "/templates";

const bearerToken: AuthDefinition = {
  key: "bearer-token",
  type: "bearer",
  displayName: "API Token",
  description: "A project API token from placid.app: Projects, choose the project, API Tokens.",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "placid.app Projects overview, the project, then API Tokens in the left menu. Tokens " +
        "are project-specific.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<PlacidCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<PlacidCredential>;
    const apiToken = (cred?.apiToken ?? "").trim();
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken }) },
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, message: `Placid returned a non-JSON body (HTTP ${res.status})` };
    }
    if (body && typeof body === "object" && Array.isArray((body as { data?: unknown }).data)) {
      return { ok: true };
    }
    const message = errorText(body);
    if (message && /unauthenticated/i.test(message)) {
      return {
        ok: false,
        message: "Placid rejected the API token (Unauthenticated). Check it was copied exactly " +
          "from the project's API Tokens page and has not been deleted.",
      };
    }
    return {
      ok: false,
      message: `Placid did not accept the token (HTTP ${res.status})${
        message ? `: ${message}` : ""
      }`,
    };
  },
};

export default bearerToken;
