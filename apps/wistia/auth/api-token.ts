import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, API_VERSION, VERSION_HEADER } from "../lib/client.ts";

export interface WistiaCredential {
  apiToken: string;
}

/**
 * The probe. `GET /modern/account` is documented as needing "(any scope allowed)", so the
 * narrowest usable token can reach it (`/medias` needs "Read all folder and media data"). Its
 * response is `{id, name, url, media_count, video_limit, folder_count, channel_count}` — the
 * caller's token is never in it.
 */
export const PROBE_PATH = "/account";

export function authHeaders(credential: Partial<WistiaCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste an API token from Wistia: Account Settings > API Access. Grant the permissions the " +
    "workflows using this connection need — read-only tokens work for every read action.",
  connectionLabel: "Wistia ({{accountName}})",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Wistia > Account Settings > API Access. Write actions need a token with " +
        '"Read, update & delete anything"; stats need "Read detailed stats".',
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<WistiaCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<WistiaCredential>)?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: {
        accept: "application/json",
        [VERSION_HEADER]: API_VERSION,
        ...authHeaders({ apiToken: token }),
      },
    });
    if (res.ok) return { ok: true };

    // Classify from the body's own `code`; the status is only a hint.
    const body = await res.json().catch(() => null) as { code?: string; error?: string } | null;
    const code = body?.code;
    if (code === "unauthorized_credentials") {
      return {
        ok: false,
        message: "Wistia rejected the token (unauthorized_credentials). Check it was copied " +
          "exactly and has not been revoked in Account Settings > API Access.",
      };
    }
    if (code === "account_inactive") {
      return { ok: false, message: "The Wistia account is inactive (account_inactive)." };
    }
    if (code === "unauthorized_scope" || code === "unauthorized_params") {
      return {
        ok: false,
        message: `Wistia refused the account read (${code})${body?.error ? `: ${body.error}` : ""}`,
      };
    }
    return { ok: false, message: `Wistia returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  async afterConnect({ credential }, ctx) {
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: {
          accept: "application/json",
          [VERSION_HEADER]: API_VERSION,
          ...authHeaders(credential as Partial<WistiaCredential>),
        },
      });
      if (!res.ok) return {};
      const body = await res.json() as { id?: number; name?: string; url?: string };
      if (!body?.name) return {};
      return {
        accountName: body.name,
        ...(body.id !== undefined ? { accountId: String(body.id) } : {}),
        ...(body.url ? { accountUrl: body.url } : {}),
      };
    } catch {
      return {};
    }
  },
};

export default apiToken;
