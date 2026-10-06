import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorText } from "../lib/client.ts";

export interface RecruitCredential {
  apiToken: string;
}

/**
 * The probe. `GET /v1/users` answers the account's users (`{id, first_name, last_name, email,
 * contact_number}`) — the spec's response schema carries no credential, so the caller's token
 * is never echoed. `GET /v1/candidates` would also work but returns personal data for no gain.
 */
export const PROBE_PATH = "/users";

export function authHeaders(credential: Partial<RecruitCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste the API token from Recruit CRM: Admin Settings > API (the vendor's docs place it " +
    "under Account Management). The token must be activated there before it works.",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Recruit CRM > Admin Settings > API. Activate the token or every call is refused.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<RecruitCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<RecruitCredential>)?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    const text = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* classified below */ }

    // Verdict from the body, not the status. A success is a JSON array/object WITHOUT an
    // error string; an SPA shell or edge page answering 200 is not a pass.
    const failure = errorText(body);
    if (res.ok && body !== null && typeof body === "object" && failure === undefined) {
      return { ok: true };
    }
    if (failure !== undefined) {
      if (/not[_ ]active|activate/i.test(failure)) {
        return {
          ok: false,
          message: `Recruit CRM says the token is not active (${failure}). Activate it in ` +
            "Admin Settings > API.",
        };
      }
      return {
        ok: false,
        message: `Recruit CRM rejected the token (${failure}). Check it was copied exactly ` +
          "and is activated in Admin Settings > API.",
      };
    }
    return {
      ok: false,
      message:
        `Recruit CRM returned HTTP ${res.status} without its JSON envelope for ${PROBE_PATH}`,
    };
  },
};

export default apiToken;
