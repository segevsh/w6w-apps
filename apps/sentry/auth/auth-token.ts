import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX, DEFAULT_ENDPOINT } from "../lib/client.ts";

/**
 * Auth Token (`apiKey`, bearer) — a Sentry **user auth token** (Settings →
 * Account → User Auth Tokens) or an **organization auth token** (Settings →
 * Auth Tokens, the `sntrys_…` kind).
 *
 * Verified against Sentry's own OpenAPI schema
 * (https://github.com/getsentry/sentry-api-schema): the only non-DSN security
 * scheme is `auth_token`, `{"type": "http", "scheme": "bearer"}` — so every
 * request signs with a plain `Authorization: Bearer <token>`.
 *
 * `endpoint` and `organizationSlug` are collected here rather than repeated on
 * every action: the host varies by region and deployment model, and almost
 * every Sentry endpoint is organization-scoped. Both are published to
 * `connection.display` (public metadata, never the credential) by
 * `afterConnect`; actions read them from there and may override the org
 * per call.
 */
const authToken: AuthDefinition = {
  key: "auth-token",
  type: "apiKey",
  displayName: "Auth Token",
  description: "Paste a Sentry auth token — Settings → Account → User Auth Tokens (personal) or " +
    "Settings → Auth Tokens (organization, `sntrys_…`). Sent as `Authorization: Bearer <token>`.",
  connectionLabel: "{{organizationSlug}}",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "token",
      label: "Auth Token",
      type: "secret",
      required: true,
      hint: "Needs at least `org:read` and `project:read`; add `event:write` to triage issues.",
    },
    {
      key: "organizationSlug",
      label: "Organization Slug",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "The slug in your Sentry URL: sentry.io/organizations/<slug>/.",
    },
    {
      key: "endpoint",
      label: "Sentry URL",
      type: "string",
      default: DEFAULT_ENDPOINT,
      placeholder: DEFAULT_ENDPOINT,
      hint:
        "https://us.sentry.io or https://de.sentry.io for SaaS; your own base URL if self-hosted.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { token, organizationSlug, endpoint } = credential as {
      token?: string;
      organizationSlug?: string;
      endpoint?: string;
    };
    if (!token) return { ok: false, message: "credential missing token" };
    if (!organizationSlug) return { ok: false, message: "credential missing organizationSlug" };
    const base = (endpoint?.trim() || DEFAULT_ENDPOINT).replace(/\/+$/, "");

    // `GET /organizations/{slug}/` is the cheapest call that proves both halves
    // of this credential at once — the token is live AND it can see the org the
    // connection names. `GET /organizations/` would pass for a token scoped to
    // some other org; `detailed=0` skips the projects+teams payload.
    // (Scopes: org:read — the narrowest this app asks for.)
    const res = await ctx.fetch(
      `${base}${API_PREFIX}/organizations/${encodeURIComponent(organizationSlug)}/?detailed=0`,
      { headers: { authorization: `Bearer ${token}`, accept: "application/json" } },
    );
    if (res.status === 401) return { ok: false, message: "Sentry rejected the token (401)" };
    if (res.status === 403) {
      return { ok: false, message: `token cannot read organization "${organizationSlug}" (403)` };
    }
    if (res.status === 404) {
      return { ok: false, message: `no such organization "${organizationSlug}" (404)` };
    }
    if (!res.ok) return { ok: false, message: `Sentry returned ${res.status}` };
    return { ok: true };
  },

  afterConnect({ credential }) {
    const { organizationSlug, endpoint } = credential as {
      organizationSlug?: string;
      endpoint?: string;
    };
    return {
      organizationSlug,
      endpoint: (endpoint?.trim() || DEFAULT_ENDPOINT).replace(/\/+$/, ""),
    };
  },
};

export default authToken;
