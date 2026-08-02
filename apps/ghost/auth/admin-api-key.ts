import type { AuthDefinition } from "@w6w/types";
import { resolveBaseUrl } from "../lib/client.ts";
import { parseAdminApiKey, signAdminApiJwt } from "../lib/jwt.ts";

/**
 * Admin API Key (`admin-api-key`) — Ghost's own auth scheme, and the only one
 * that supports full read/write access (posts, pages, members, tags, tiers).
 * Not OAuth2, not a plain API key: the credential is a long-lived key PAIR
 * (`<id>:<secret>`, minted once when a Custom Integration is created in Ghost
 * Admin → Settings → Integrations), which this method uses to mint a fresh,
 * short-lived (5-minute) HS256 JSON Web Token on every request — see
 * `lib/jwt.ts` for the exact header/claim shape, verified against Ghost's own
 * reference client (`github.com/TryGhost/SDK`).
 *
 * Minting the JWT is pure local HMAC computation (WebCrypto, no network
 * access), so it fits the network-less `sign` hook exactly the way Snowflake's
 * RSA key-pair JWT does — a fresh token is signed per request rather than
 * cached, since a stored key pair never itself expires but each minted token
 * does within 5 minutes.
 *
 * `siteUrl` is per-connection because Ghost is self-hosted per tenant (like
 * WordPress) — there is no shared apex to allow-list, hence
 * `w6w.network.allow: ["*"]` on the manifest. For Ghost(Pro), `siteUrl` is the
 * "API URL" shown alongside the key on the same integration screen, which is
 * not always the site's public custom domain.
 *
 * There is no OAuth2 path: Ghost's Admin API does not offer one — every
 * official client (including Ghost's own admin client library) authenticates
 * this same way.
 */
const adminApiKey: AuthDefinition = {
  key: "admin-api-key",
  type: "custom",
  displayName: "Admin API Key",
  description:
    "JWT authentication against a self-hosted (or Ghost(Pro)) site's Admin API, using the key " +
    "pair issued to a Custom Integration (Ghost Admin → Settings → Integrations).",
  connectionLabel: "{{site.title}} ({{site.host}})",
  fields: [
    {
      key: "siteUrl",
      label: "Ghost Site URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
      hint: "The Admin API URL shown next to the Admin API Key on the integration's page — " +
        "usually your site's own URL, without a trailing `/ghost/api/admin`.",
    },
    {
      key: "apiKey",
      label: "Admin API Key",
      type: "secret",
      required: true,
      hint: "Settings → Integrations → (your custom integration) → Admin API Key, in the form " +
        "`<id>:<secret>`. This key can create, edit and delete content — keep it private.",
    },
  ],

  /**
   * The ONLY hook given the raw credential. Mints a fresh JWT per request —
   * pure local HMAC signing, no network access.
   */
  async sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    const token = await signAdminApiJwt(apiKey);
    request.headers["authorization"] = `Ghost ${token}`;
    return request;
  },

  /**
   * Validates the key pair is well-formed AND accepted by the site: mints a
   * token and calls the cheapest authenticated read available, `GET
   * /users/?limit=1` — proves the JWT is accepted without depending on there
   * being any posts/pages/members to read.
   */
  async test({ credential }, ctx) {
    const { siteUrl, apiKey } = credential as { siteUrl?: string; apiKey?: string };
    if (!siteUrl || !apiKey) {
      return { ok: false, message: "credential missing siteUrl / apiKey" };
    }
    let baseUrl: string;
    let token: string;
    try {
      baseUrl = resolveBaseUrl({ siteUrl });
      parseAdminApiKey(apiKey); // throws with a clear message on a malformed key
      token = await signAdminApiJwt(apiKey);
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
    const res = await ctx.fetch(`${baseUrl}/users/?limit=1`, {
      headers: { authorization: `Ghost ${token}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Ghost returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records `siteUrl` and the site's public title/host on the connection so
   * `lib/client.ts` can build request URLs, and `connectionLabel` has
   * something to render, without either ever touching the credential. Uses
   * the unauthenticated `GET /site/` — the one Admin API route Ghost itself
   * does not require a JWT for — so this needs no token at all.
   */
  async afterConnect({ credential }, ctx) {
    const { siteUrl } = credential as { siteUrl?: string };
    let baseUrl: string | undefined;
    try {
      baseUrl = siteUrl ? resolveBaseUrl({ siteUrl }) : undefined;
    } catch { /* leave undefined */ }

    let site: { title?: string; version?: string } = {};
    if (baseUrl) {
      const res = await ctx.fetch(`${baseUrl}/site/`, { headers: { accept: "application/json" } });
      if (res.ok) {
        const body = await res.json() as { site?: { title?: string; version?: string } };
        site = body.site ?? {};
      }
    }
    let host = "";
    try {
      host = siteUrl ? new URL(siteUrl).host : "";
    } catch { /* leave blank */ }

    return {
      siteUrl,
      site: { title: site.title, version: site.version, host },
    };
  },
};

export default adminApiKey;
