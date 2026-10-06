import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Key + Secret (`basic`).
 *
 * Every authenticated call carries HTTP Basic auth where the username is the
 * **API Key** and the password is the **Secret** that was generated with it
 * (`Authorization: Basic base64("<key>:<secret>")`). A user may hold several keys.
 * Keys are created in the Formstack Documents account page. Verified 2026-10-06
 * against `www.webmerge.me/developers/authentication`.
 *
 * `btoa` is safe here: both halves are vendor-issued uppercase alphanumerics.
 *
 * ## The probe
 *
 * `GET /documents?search=...` returns the caller's documents as a JSON array —
 * nothing in the body echoes the credential. The search term is one no document
 * is likely to match, so a large account answers `[]` instead of its whole
 * library; if the server ignored `search`, the array would still be a valid pass.
 *
 * A rejected pair answers a bare **401 with an empty `text/html` body**, so the
 * body cannot classify it. What *can* is the positive side: a credentialed
 * success is a JSON **array**. Anything else with a 2xx (an HTML shell, an
 * object) is reported as "not the API" rather than as a pass.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key & Secret",
  description:
    "Create an API Key in your Formstack Documents account page; the Secret is generated alongside it. Used as HTTP Basic username (Key) and password (Secret).",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Account page → API Keys.",
    },
    {
      key: "apiSecret",
      label: "API Secret",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Shown with the key when you generate it.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey, apiSecret } = credential as { apiKey: string; apiSecret: string };
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey, apiSecret } = credential as { apiKey?: string; apiSecret?: string };
    if (!apiKey || !apiSecret) {
      return { ok: false, message: "credential missing apiKey or apiSecret" };
    }
    const res = await ctx.fetch(`${API_URL}/documents?search=w6w-credential-probe-zzz`, {
      headers: {
        authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
        accept: "application/json",
      },
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Formstack Documents rejected the API key/secret (${res.status})`,
      };
    }
    if (!res.ok) return { ok: false, message: `Formstack Documents returned ${res.status}` };
    const body = await res.json().catch(() => null);
    if (!Array.isArray(body)) {
      return { ok: false, message: "unexpected response — not the Formstack Documents API" };
    }
    return { ok: true };
  },
};

export default apiKey;
