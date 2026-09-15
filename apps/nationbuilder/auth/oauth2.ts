import type { AuthDefinition } from "@w6w/types";
import { baseUrl, errorMessage } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization code flow against the nation's own host.
 *
 * Confirmed against NationBuilder's "API Authentication Guide"
 * (`support.nationbuilder.com/en/articles/9903805`, fetched 2026-09-15):
 * register an app under the nation's own Settings > Developer > Register New
 * App, then run the standard authorization-code dance against
 * `https://{slug}.nationbuilder.com/oauth/authorize` and
 * `.../oauth/token`. The `{slug}` placeholder is filled in by the host from
 * the connection's `slug` field when it builds the authorize URL — which
 * also means the OAuth host is not added to the egress allowlist implicitly,
 * and `*.nationbuilder.com` in `package.json` is what actually permits it.
 * This is the same pattern this pack already uses for Zendesk's per-account
 * `{subdomain}` OAuth host.
 *
 * ## Developer tools are gated, not just a registration form
 *
 * The same guide states plainly: "Developer tools are only available to
 * NationBuilder certified developers or nations on an Enterprise or Network
 * plan." Registering the OAuth app that yields a Client ID/Secret needs one
 * of those two things — this is not a self-serve "create an app" screen the
 * way most vendors in this pack offer, and a nation on a lower plan without
 * certified-developer status cannot complete this flow at all. See
 * `auth/api-token.ts` for the fallback that at least reaches a nation whose
 * owner already has *a* token.
 *
 * ## No custom `exchange`/`refresh` hooks
 *
 * Both the auth guide's numbered walkthrough and the separate "Generating
 * API Tokens" article's refresh example show the token endpoint accepting a
 * JSON body (`Content-Type: application/json`), not the form-encoded body
 * RFC 6749 mandates servers accept. Since this app declares `type: "oauth2"`,
 * the host performs the token exchange itself with the generic, spec-required
 * form-encoded request — the same posture every other `oauth2`-type app in
 * this pack takes (none declare a custom `exchange`/`refresh` hook). RFC 6749
 * requires the token endpoint to accept `application/x-www-form-urlencoded`,
 * so this should work even though NationBuilder's own docs only show a JSON
 * example; this is called out here because it could not be verified against
 * a live nation and is the kind of gap worth re-checking against a real
 * OAuth app if a connection ever fails at the token-exchange step.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with NationBuilder)",
  description:
    "Public OAuth flow. Requires an OAuth app registered in the nation's control panel under " +
    "Settings > Developer > Register New App — available only to NationBuilder certified " +
    "developers or nations on an Enterprise or Network plan.",
  connectionLabel: "{{user.name}} ({{slug}})",
  fields: [
    {
      key: "slug",
      label: "Nation slug",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the slug from `acme.nationbuilder.com`. It selects the OAuth host too.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
  ],
  oauth2: {
    authorizationUrl: "https://{slug}.nationbuilder.com/oauth/authorize",
    tokenUrl: "https://{slug}.nationbuilder.com/oauth/token",
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /api/v2/signups/me` — "Show signup assigned to auth token" per the
   * vendor's own OpenAPI spec. Needs no scope beyond a live token and returns
   * the caller's own person record, never the token itself.
   */
  async test({ credential }, ctx) {
    const { slug, accessToken } = credential as { slug?: string; accessToken?: string };
    if (!slug || !accessToken) {
      return { ok: false, message: "credential missing slug or accessToken" };
    }
    const res = await ctx.fetch(`${baseUrl(slug)}/signups/me`, {
      headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        message: `NationBuilder rejected the token (401${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }).`,
      };
    }
    if (!res.ok) return { ok: false, message: `NationBuilder returned ${res.status}` };
    return { ok: true };
  },

  /** Records the slug and the caller's own name on the connection. Never the token. */
  async afterConnect({ credential }, ctx) {
    const { slug, accessToken } = credential as { slug?: string; accessToken?: string };
    if (!slug || !accessToken) return {};
    try {
      const res = await ctx.fetch(`${baseUrl(slug)}/signups/me`, {
        headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
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

export default oauth2;
