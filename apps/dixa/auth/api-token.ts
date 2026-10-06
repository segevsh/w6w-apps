import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export interface DixaCredential {
  apiToken: string;
}

/**
 * The probe. `GET /v1/agents` lists the organisation's agents: `{data: [{id, displayName, email,
 * roles…}], meta}`. The caller's token is never in it. (`/v1/organization` would also do; the
 * agents list is the one the rest of the app depends on.)
 */
export const PROBE_PATH = "/agents";

/** Dixa takes the RAW token in `Authorization` — an `apiKey` scheme named Authorization. */
export function authHeaders(credential: Partial<DixaCredential>): Record<string, string> {
  return { authorization: (credential.apiToken ?? "").trim() };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Paste an API token from Dixa: Settings > Integrations > API tokens. Dixa expects the raw " +
    "token in the Authorization header with no `Bearer` prefix; the app does that for you.",
  connectionLabel: "Dixa",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Dixa > Settings > Integrations > API tokens. Create it as an admin.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<DixaCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<DixaCredential>)?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?pageLimit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    const body = await res.json().catch(() => null) as
      | { data?: unknown; message?: string }
      | null;

    // The documented success shape is `{data: [...]}`; a 200 without it is not Dixa answering.
    if (res.ok) {
      return Array.isArray(body?.data)
        ? { ok: true }
        : { ok: false, message: "Dixa answered but not with the documented {data: []} body" };
    }
    // Errors are `{message}`; API Gateway's 401 is `{"message":"Unauthorized"}` for a missing,
    // wrong or unauthorised token alike, so the message is quoted rather than interpreted.
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message:
          `Dixa rejected the token (${body?.message ?? "Unauthorized"}). Check it was copied ` +
          "exactly, has not been revoked, and belongs to a user allowed to read agents.",
      };
    }
    return {
      ok: false,
      message: `Dixa returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.message ? `: ${body.message}` : ""
      }`,
    };
  },
};

export default apiToken;
