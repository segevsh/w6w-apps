import type { AuthDefinition } from "@w6w/types";
import { API_BASE, baseHeaders, errorText } from "../lib/client.ts";

/**
 * Aidbase API key — `Authorization: Bearer <key>`.
 *
 * Keys are created in the Aidbase dashboard (Settings > API Keys), where the scopes the key
 * carries are chosen; the key is shown once.
 *
 * ## The probe is `GET /status`
 *
 * The get-started guide documents it as the test request: `{ success, data: { status: "ok",
 * token: "absk-........a3d0" } }`. The `token` is a MASKED echo of the key (prefix + last four),
 * never the key itself, and `test` reads only `status`.
 *
 * ## Classification is from the body
 *
 * Measured 2026-10-06: no header answers `401 {"success":false,"message":"Failed to authorize
 * the user. The API key is missing."}`, a bogus key answers `401 ... The API key is invalid.`
 * (same shape, different `message`). A pass is a 2xx with `data.status === "ok"`; a 401/403 is
 * a rejection that quotes the vendor's own `message`; anything else is not judged.
 */

export interface AidbaseCredential {
  apiKey: string;
}

export const PROBE_PATH = "/status";

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<AidbaseCredential>): Record<string, string> {
  return { authorization: `Bearer ${(credential.apiKey ?? "").trim()}` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste an Aidbase API key (Settings > API Keys). The key's scopes decide which " +
    "write actions work.",
  connectionLabel: "Aidbase",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Aidbase > Settings > API Keys. Paste the key only; the `Bearer ` prefix is added " +
        "for you. Grant the write scopes you need (chatbots, email inboxes, ticket forms).",
    },
  ],

  /** The only hook handed the raw credential; network-less, it stamps the header. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<AidbaseCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<AidbaseCredential>;
    const raw = (cred?.apiKey ?? "").trim();
    if (!raw) return { ok: false, message: "credential missing apiKey" };
    if (/^bearer\s/i.test(raw)) {
      return {
        ok: false,
        message: 'Paste the key only — the "Bearer " prefix is added for you.',
      };
    }

    // `sign` only auto-applies to action traffic, so the header is built by hand here.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { ...baseHeaders(), ...authHeaders(cred) },
    });
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;
    const data = (body?.data ?? null) as Record<string, unknown> | null;

    if (res.ok) {
      if (body?.success === true && data?.status === "ok") return { ok: true };
      return {
        ok: false,
        message: `Aidbase answered ${res.status} but not with the documented /status ` +
          "response — not judged a valid key.",
      };
    }
    const msg = errorText(body);
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Aidbase refused the key (${res.status}${msg ? ` ${msg}` : ""}). Check it was ` +
          "copied from Settings > API Keys and has not been deleted.",
      };
    }
    return {
      ok: false,
      message: `Aidbase returned HTTP ${res.status}${msg ? ` (${msg})` : ""} for /status; ` +
        "the key was not judged.",
    };
  },
};

export default apiKey;
