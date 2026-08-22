import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";

/**
 * OAuth 2.0 (authorization-code grant) against Sentry's SaaS. The
 * `client_id` / `client_secret` / `redirect_uri` live on the w6w server
 * (`PUT /apps/:id/oauth-config/oauth2`), not in this package; the OAuth
 * Application itself is registered in Sentry under
 * Settings → Account → API → Applications.
 *
 * Endpoints verified live on 2026-08-18 — both answer as real OAuth
 * endpoints rather than the catch-all HTML shell `sentry.io` serves for
 * unknown paths:
 *
 *   GET  https://sentry.io/oauth/authorize/?response_type=code&client_id=test → 400
 *   POST https://sentry.io/oauth/token/                                       → 400 {"error":"invalid_request"}
 *
 * Scopes are the read-plus-triage set this app's actions need, named exactly
 * as Sentry's own OpenAPI schema lists them in each operation's `security`
 * block (https://github.com/getsentry/sentry-api-schema).
 *
 * **SaaS only, and single-region.** This flow issues tokens from `sentry.io`;
 * a self-hosted install runs its own OAuth service, and the EU region is a
 * separate host. Use the `auth-token` method for either — it takes the
 * install's base URL as a field.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Sentry)",
  description:
    "Public OAuth flow against sentry.io. Requires a Sentry OAuth Application registered on " +
    "this w6w installation. For self-hosted or EU-region installs, use the Auth Token method.",
  connectionLabel: "{{organizationSlug}}",
  oauth2: {
    authorizationUrl: "https://sentry.io/oauth/authorize/",
    tokenUrl: "https://sentry.io/oauth/token/",
    scopes: [
      "org:read",
      "project:read",
      "project:releases",
      "team:read",
      "member:read",
      "event:read",
      "event:write",
    ],
    scopeSeparator: " ",
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    // `GET /organizations/` is the whoami of a Sentry OAuth token: it needs only
    // `org:read`, the narrowest scope this flow requests, and returns the orgs
    // the token can actually see.
    const res = await ctx.fetch(`https://sentry.io${API_PREFIX}/organizations/`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Sentry returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken: string };
    // Best-effort label data. There is no org field to collect in an OAuth
    // flow, so the org is READ rather than asked for: when the token sees
    // exactly one organization it becomes this connection's default, and when
    // it sees several the actions' own `organizationSlug` param decides. A
    // failure here must not fail the connect flow.
    const res = await ctx.fetch(`https://sentry.io${API_PREFIX}/organizations/`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { endpoint: "https://sentry.io" };
    const orgs = await res.json().catch(() => null) as Array<{ slug?: string }> | null;
    const slugs = (orgs ?? []).map((o) => o.slug).filter((s): s is string => !!s);
    return {
      endpoint: "https://sentry.io",
      organizations: slugs,
      ...(slugs.length === 1 ? { organizationSlug: slugs[0] } : {}),
    };
  },
};

export default oauth2;
