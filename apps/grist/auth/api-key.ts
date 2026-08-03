import type { AuthDefinition } from "@w6w/types";
import { DEFAULT_SITE_URL, resolveBaseUrl } from "../lib/client.ts";

/**
 * API key (`bearer`) — the default path, and the only one that works against a
 * self-hosted install without registering an OAuth app.
 *
 * A key is minted per user on the Developer tab of Account settings
 * (`<site>/account` → Developer; on the hosted personal site that is
 * https://docs.getgrist.com/account). Grist's own words: "You'll then have the
 * option to create a new one if you wish" — a user holds at most one key at a
 * time, and pressing Remove revokes it immediately.
 *
 * The key inherits the minting user's access exactly. There are no scopes: if
 * the user can read a doc in the browser, the key can read it through the API.
 * (For scoped access, see `./oauth2.ts`.)
 *
 * The **site URL is half the connection**, which is why it is a field here
 * rather than an action param: hosted personal (`docs.getgrist.com`), hosted
 * team (`<team>.getgrist.com`) and self-hosted are all the same server, and a
 * key is only valid on the one it was minted on. It is a plain `string`, not a
 * `secret` — a URL is an address, not a secret, and masking it would make a
 * typo impossible to spot.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Bearer API key from Grist's Account settings → Developer tab. Works on hosted and self-hosted sites alike.",
  connectionLabel: "{{user.name}} @ {{site.host}}",
  fields: [
    {
      key: "siteUrl",
      label: "Grist Site URL",
      type: "string",
      required: true,
      default: DEFAULT_SITE_URL,
      placeholder: DEFAULT_SITE_URL,
      hint:
        "Base URL of your Grist site, without `/api`. Hosted personal: https://docs.getgrist.com · " +
        "hosted team: https://<team>.getgrist.com · self-hosted: your own origin.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Account settings → Developer → API Key → Create.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  /**
   * `GET /api/profile/user` is the right liveness probe because it needs no
   * permission beyond existing — probing a doc or an org would report a working
   * key as broken whenever that user simply has not been shared the thing.
   *
   * The `anonymous` guard is NOT belt-and-braces. Verified on the wire against
   * https://docs.getgrist.com on 2026-08-03: with **no** Authorization header
   * this endpoint answers **200** with
   * `{"id":40,"email":"anon@getgrist.com","name":"Anonymous","anonymous":true}`,
   * and only a *malformed* key produces `401 {"error":"Bad request: invalid API
   * key"}`. A bare `res.ok` test would therefore pass for a connection that is
   * not authenticated at all — most visibly on a self-hosted server that allows
   * anonymous access. `anonymous !== true` is the check that means something.
   */
  async test({ credential }, ctx) {
    const { siteUrl, apiKey } = credential as { siteUrl?: string; apiKey?: string };
    if (!siteUrl) return { ok: false, message: "credential missing siteUrl" };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    let baseUrl: string;
    try {
      baseUrl = resolveBaseUrl({ siteUrl });
    } catch {
      return { ok: false, message: "siteUrl is not a usable base URL" };
    }

    const res = await ctx.fetch(`${baseUrl}/profile/user`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Grist returned ${res.status}` };

    const user = await res.json().catch(() => ({})) as { anonymous?: boolean };
    if (user.anonymous === true) {
      return { ok: false, message: "Grist answered as the anonymous user — the key did not apply" };
    }
    return { ok: true };
  },

  /**
   * Republishes the site URL onto `connection.display` so action code — which
   * only ever sees the redacted Connection — can compute the base URL without
   * touching the credential.
   */
  async afterConnect({ credential }, ctx) {
    const { siteUrl } = credential as { siteUrl?: string };
    const res = await ctx.fetch("/profile/user");
    let user: { id?: number; name?: string; email?: string } = {};
    if (res.ok) user = await res.json().catch(() => ({})) as typeof user;

    let host = "";
    try {
      host = siteUrl ? new URL(siteUrl).host : "";
    } catch { /* leave blank */ }

    return {
      siteUrl,
      site: { host },
      user: { id: user.id, name: user.name, email: user.email },
    };
  },
};

export default apiKey;
