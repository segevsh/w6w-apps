import type { AuthDefinition } from "@w6w/types";
import { baseUrl, errorMessage } from "../lib/client.ts";

/**
 * A short-lived personal API token, pasted directly — `Authorization: Bearer
 * <token>` (confirmed via the vendor's own curl example in "Generating API
 * Tokens", `support.nationbuilder.com/en/articles/9559128`, fetched
 * 2026-09-15: `curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ...`).
 *
 * ## Why this exists alongside OAuth
 *
 * NationBuilder's own quickstart guide documents exactly two ways to get a
 * v2 access token: the OAuth 2.0 authorization-code flow (`auth/oauth2.ts`),
 * and a "test token" generated from the nation's own control panel at
 * Settings > Developer > API token. The docs are explicit that this token
 * **expires in 24 hours and cannot be refreshed**, and say in so many words:
 * "Do not use this test token in your production app. Instead, implement the
 * OAuth flow." It is offered here anyway, the same way this pack offers a
 * simpler credential alongside OAuth elsewhere (Zendesk's API token next to
 * its OAuth app), because it is the only way to connect a nation whose owner
 * does not have — or does not want to pursue — the Certified Developer
 * status or Enterprise/Network plan that OAuth app registration requires.
 * The 24-hour expiry is not modeled with a `refresh` hook: the docs are
 * explicit no refresh token is issued for it, so once it expires the only
 * fix is generating a new one and reconnecting.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "Personal API Token (test/dev)",
  description:
    "Paste a test access token from the nation's control panel: Settings > Developer > API " +
    "token. This token expires in 24 hours and cannot be refreshed — it is meant for " +
    "development, not a production workflow. For a connection that keeps working, use OAuth.",
  connectionLabel: "{{user.name}} ({{slug}})",
  fields: [
    {
      key: "slug",
      label: "Nation slug",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the slug from `acme.nationbuilder.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Settings > Developer > API token, in the nation's control panel. Expires in 24 hours.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken?: string };
    request.headers["authorization"] = `Bearer ${apiToken ?? ""}`;
    return request;
  },

  /** See `auth/oauth2.ts`'s `test` hook doc for why `/signups/me` was chosen. */
  async test({ credential }, ctx) {
    const { slug, apiToken } = credential as { slug?: string; apiToken?: string };
    if (!slug || !apiToken) return { ok: false, message: "credential missing slug or apiToken" };

    const res = await ctx.fetch(`${baseUrl(slug)}/signups/me`, {
      headers: { accept: "application/json", authorization: `Bearer ${apiToken}` },
    });
    if (res.status === 401) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        message: `NationBuilder rejected the token (401${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }). Test tokens expire after 24 hours — generate a new one if it's stale.`,
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `no NationBuilder nation at ${slug}.nationbuilder.com (404) — check the slug.`,
      };
    }
    if (!res.ok) return { ok: false, message: `NationBuilder returned ${res.status}` };
    return { ok: true };
  },

  /** Records the slug and the token owner's own name on the connection. Never the token. */
  async afterConnect({ credential }, ctx) {
    const { slug, apiToken } = credential as { slug?: string; apiToken?: string };
    if (!slug || !apiToken) return {};
    try {
      const res = await ctx.fetch(`${baseUrl(slug)}/signups/me`, {
        headers: { accept: "application/json", authorization: `Bearer ${apiToken}` },
      });
      if (!res.ok) return { slug };
      const body = await res.json().catch(() => null) as {
        data?: { id?: string; attributes?: { first_name?: string; last_name?: string } };
      } | null;
      const attrs = body?.data?.attributes;
      const name = [attrs?.first_name, attrs?.last_name].filter(Boolean).join(" ").trim();
      return name ? { slug, user: { name } } : { slug };
    } catch {
      return { slug };
    }
  },
};

export default apiToken;
