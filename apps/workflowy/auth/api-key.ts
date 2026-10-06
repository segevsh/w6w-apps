import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatError } from "../lib/client.ts";

/**
 * WorkFlowy API key — `Authorization: Bearer <key>`.
 *
 * Keys are generated at https://workflowy.com/api-key/ ("Get API Key" in the
 * reference). A rejected key answers 401 `{"errors": "Invalid Credentials, try
 * again."}` (observed live 2026-10-06).
 *
 * ## Probe: `GET /api/v1/targets`
 *
 * It needs a credential (401 without one, observed live), takes no parameters,
 * and returns only shortcut keys and node names — no credential material and no
 * whoami payload. WorkFlowy offers no user-profile endpoint at all.
 */
export interface WorkflowyCredential {
  apiKey: string;
}

export const PROBE_PATH = "/targets";

export function authHeaders(credential: Partial<WorkflowyCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste your WorkFlowy API key from workflowy.com/api-key.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Generate one at https://workflowy.com/api-key/ while signed in.",
    },
  ],

  sign({ request, credential }) {
    const cred = credential as Partial<WorkflowyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<WorkflowyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null);
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `${formatError(res.status, body)}. Check the key was copied exactly and has ` +
          "not been regenerated at workflowy.com/api-key.",
      };
    }
    return { ok: false, message: formatError(res.status, body) };
  },
};

export default apiKey;
