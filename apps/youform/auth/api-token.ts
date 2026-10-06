import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Youform API token — `Authorization: Bearer <access_token>`.
 *
 * Quoted from the collection description: "All authenticated routes needs
 * access_token as bearer token in the header", created at
 * `https://app.youform.com/account` → API Tokens. Youform's help centre says
 * tokens are available on every plan, the Free plan included.
 */
export interface YouformCredential {
  token: string;
}

export function authHeaders(credential: Partial<YouformCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.token ?? ""}` };
}

/**
 * Credential probe: `GET /api/me`. Its response schema is exactly
 * `{data: {id, first_name, last_name, email}}` — no key or token — so the
 * whoami is safe to store (unlike Mailjet's `/apikey` or Follow Up Boss's `/me`).
 *
 * Verified live: no token and a fake bearer both answer `401
 * {"message":"Unauthenticated."}`, so a rejected token is classified from that
 * body, not just the status.
 */
export const PROBE_PATH = "/me";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description: "Paste an API token from Youform → Account Settings → API Tokens.",
  connectionLabel: "Youform ({{email}})",
  fields: [
    {
      key: "token",
      label: "API token",
      type: "secret",
      required: true,
      hint: "Created at app.youform.com/account in the API Tokens section.",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<YouformCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<YouformCredential>)?.token ?? "").trim();
    if (!token) return { ok: false, message: "credential missing token" };

    const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ token }) },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) {
      return {
        ok: false,
        message: "Youform rejected the token (401 Unauthenticated). Check it was copied exactly " +
          "and has not been deleted under Account Settings → API Tokens.",
      };
    }
    return { ok: false, message: `Youform returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /** Publish the account email and name for the connection label; failures stay silent. */
  async afterConnect({ credential }, ctx) {
    try {
      const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
        headers: {
          accept: "application/json",
          ...authHeaders(credential as Partial<YouformCredential>),
        },
      });
      if (!res.ok) return {};
      const body = await res.json() as {
        data?: { email?: string; first_name?: string; last_name?: string };
      };
      const out: Record<string, string> = {};
      if (body?.data?.email) out.email = body.data.email;
      const name = [body?.data?.first_name, body?.data?.last_name].filter(Boolean).join(" ");
      if (name) out.name = name;
      return out;
    } catch {
      return {};
    }
  },
};

export default apiToken;
