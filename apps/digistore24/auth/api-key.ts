import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Digistore24 API key, sent as the `X-DS-API-KEY` header.
 *
 * Verified 2026-10-05: the OpenAPI document's `securitySchemes.ApiKeyAuth` is
 * `apiKey` / `header` / `X-DS-API-KEY`, and the help-center article tells
 * integrators to "set these http headers for secure authentication". The
 * documented alternative of putting the key in the URL path is not used — a
 * workflow host logs URLs, not headers.
 *
 * ## Key permissions
 *
 * Created in Digistore24 under Settings > Account access > API key, with one
 * of three permissions: `readonly` (retrieve only), `writable` (full access)
 * or `developer` (can only mint keys for a user; no read or write). A
 * readonly key is a supported, sensible configuration, so `test` must treat it
 * as healthy — which is why it probes a read.
 *
 * ## The probe: `getUserInfo`
 *
 * Its documented response is `{user_id, user_name, granted_roles,
 * granted_roles_msg}` — the account's own id, login name and role list.
 * Measured: the response carries no key material, unlike the whoami endpoints
 * of Mailjet (`/apikey`) and Follow Up Boss (`/me`) that echo the caller's own
 * key. `ping` would also reject a bad key, but it returns only the server
 * time, so it would say nothing about which account the key belongs to.
 *
 * ## Classification is from the body, never the status
 *
 * Measured live: a missing key and an invalid key both return **HTTP 200**
 * with `{"result":"error","message":"No API key given.","code":2}` /
 * `"The API key is invalid."`. Only `result` tells a working key from a
 * rejected one.
 */
export interface Ds24Credential {
  apiKey: string;
}

export const PROBE_FN = "getUserInfo";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Digistore24 > Settings > Account access > API key. A read-only key " +
    "is enough for every read action; refunds, rebilling changes and other writes need a " +
    "writable key.",
  connectionLabel: "Digistore24 ({{user_name}})",
  apiKey: { in: "header", name: "X-DS-API-KEY" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Digistore24 > Settings > Account access > API key > New API key. Choose the " +
        "permission deliberately: readonly cannot change anything, writable can refund orders. " +
        "A developer key cannot read or write and will not work here.",
    },
  ],

  /** The only hook handed the raw credential; network-less. The key never enters a URL. */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<Ds24Credential>;
    request.headers["x-ds-api-key"] = apiKey ?? "";
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<Ds24Credential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/${PROBE_FN}`, {
      headers: { accept: "application/json", "x-ds-api-key": key },
    });
    const raw = await res.text().catch(() => "");
    let body: { result?: string; message?: string; code?: number } | null = null;
    try {
      body = JSON.parse(raw);
    } catch { /* handled below */ }

    if (body?.result === "success") return { ok: true };
    if (body?.result === "error") {
      return {
        ok: false,
        message:
          `Digistore24 rejected the key${body.code !== undefined ? ` (code ${body.code})` : ""}` +
          `${body.message ? `: ${body.message}` : ""}. Check it was copied exactly, is not ` +
          "deleted, and is a readonly or writable key (not a developer key).",
      };
    }
    return {
      ok: false,
      message: `Digistore24 returned HTTP ${res.status} with no readable result for ${PROBE_FN}`,
    };
  },

  /** Publish the account's login name for the connection label, and nothing else. */
  async afterConnect({ credential }, ctx) {
    const key = ((credential as Partial<Ds24Credential>)?.apiKey ?? "").trim();
    try {
      const res = await ctx.fetch(`${API_BASE}/${PROBE_FN}`, {
        headers: { accept: "application/json", "x-ds-api-key": key },
      });
      const body = await res.json() as { data?: { user_name?: string; user_id?: number } };
      const user_name = body?.data?.user_name;
      if (!user_name) return {};
      return body.data?.user_id !== undefined
        ? { user_name, user_id: String(body.data.user_id) }
        : { user_name };
    } catch {
      return {};
    }
  },
};

export default apiKey;
