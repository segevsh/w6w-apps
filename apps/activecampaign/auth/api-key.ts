import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * API URL + API Token (`api-key`).
 *
 * Confirmed against ActiveCampaign's own docs (developers.activecampaign.com
 * /reference/authentication): every request carries the key as an `Api-Token`
 * header — no `Bearer` or other prefix. The base URL is per-account
 * (`https://<name>.api-us1.com`), but ActiveCampaign explicitly does not
 * guarantee that suffix for every account/region — the account's own
 * Settings → Developer tab shows the authoritative URL and key together, so
 * both are collected here as a single connect-time step rather than assuming
 * only the account name.
 *
 * `apiUrl` is not a secret: it is republished onto `connection.display.apiUrl`
 * by `afterConnect` so action code (which never sees the credential) can
 * build request URLs from it.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API URL & Key",
  description: "Find both under Settings → Developer in your ActiveCampaign account.",
  connectionLabel: "{{apiUrl}}",
  apiKey: { in: "header", name: "Api-Token" },
  fields: [
    {
      key: "apiUrl",
      label: "API URL",
      type: "string",
      required: true,
      placeholder: "https://youraccountname.api-us1.com",
      hint: "Settings → Developer → API URL. The full URL, without a trailing `/api/3`.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings → Developer → API Key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["api-token"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiUrl, apiKey } = credential as { apiUrl?: string; apiKey?: string };
    if (!apiUrl || !apiKey) {
      return { ok: false, message: "credential missing apiUrl / apiKey" };
    }
    // The cheapest documented read: a 1-row contact list. Needs no scope
    // beyond a working token, so it can't report a working key broken just
    // because it lacks some other resource's permission.
    const res = await ctx.fetch(`${baseUrl(apiUrl)}/contacts?limit=1`, {
      headers: { "api-token": apiKey, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `ActiveCampaign returned ${res.status}` };
    return { ok: true };
  },

  afterConnect({ credential }) {
    const { apiUrl } = credential as { apiUrl?: string };
    return { apiUrl: apiUrl?.replace(/\/+$/, "") };
  },
};

export default apiKey;
