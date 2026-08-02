import type { AuthDefinition } from "@w6w/types";
import { COMPANY_LOOKUP_HOST } from "../lib/client.ts";

/**
 * Secret API Key (`basic`).
 *
 * Clearbit's entire API surface is authenticated the same way: HTTP Basic
 * with the account's Secret API Key as the **username** and an **empty
 * password** — `Authorization: Basic base64("<key>:")`. This is not folklore;
 * it is exactly what Clearbit's own, official `clearbit-node` SDK does on
 * every request (`src/client.js`: `needle.requestAsync(..., { username:
 * this.key, password: '', ... })`, which `needle` turns into HTTP Basic).
 * Confirmed live 2026-08-01: every host this app calls returns a real
 * `401 {"error":{"type":"auth_required"}}` when called without credentials,
 * not a 404 or DNS failure, so the scheme and the surface are both still
 * live.
 *
 * Dashboard → API → find or generate a Secret API Key.
 *
 * ## HubSpot acquisition — read before connecting
 *
 * HubSpot acquired Clearbit in November 2023 and folded it into **Breeze
 * Intelligence**. As of this writing (2026-08-01): the free Clearbit tier and
 * Clearbit Connect were discontinued 2025-04-30; the free Logo API was
 * sunset 2025-12-01; `dashboard.clearbit.com/docs` now redirects straight to
 * a HubSpot login instead of serving public docs. New customers provision
 * enrichment through a HubSpot subscription, not a standalone Clearbit
 * account. **Existing** Secret API Keys minted before the migration continue
 * to authenticate against the classic hosts this app calls (verified live,
 * see above) — this app is built for that population. If your key was
 * issued through HubSpot Breeze Intelligence, it may not carry the same
 * scopes; the `test` probe below is the fastest way to find out.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "Secret API Key",
  description:
    "Clearbit Dashboard → API → Secret API Key. Sent as HTTP Basic with the key as the username and an empty password.",
  fields: [
    {
      key: "apiKey",
      label: "Secret API Key",
      type: "secret",
      required: true,
      hint: "Dashboard → API. A legacy (pre-HubSpot) Clearbit key — see this app's README.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:`)}`;
    return request;
  },

  /**
   * `GET company.clearbit.com/v1/domains/find?name=...` — the Name to Domain
   * lookup, documented (help.clearbit.com's Autocomplete/Name-to-Domain/Risk
   * FAQ) as free for existing customers, unlike Person/Company/Combined
   * Enrichment which spend a paid credit per match. It needs no scope beyond
   * "a valid key" and costs nothing to run repeatedly, which is exactly what
   * a connection test should do.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`https://${COMPANY_LOOKUP_HOST}/v1/domains/find?name=Clearbit`, {
      headers: { authorization: `Basic ${btoa(`${apiKey}:`)}` },
    });
    if (res.status === 401) return { ok: false, message: "Clearbit rejected this key (401)" };
    // A 404 ("no domain found for 'Clearbit'") would be absurd for this query in
    // practice, but even so it still proves the key authenticated — only 401
    // means the credential itself is bad.
    if (!res.ok && res.status !== 404) {
      return { ok: false, message: `Clearbit returned ${res.status}` };
    }
    return { ok: true };
  },
};

export default apiKey;
