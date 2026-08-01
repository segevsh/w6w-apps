import type { AuthDefinition } from "@w6w/types";
import { resolveBaseUrl } from "../lib/client.ts";

/**
 * API Token auth (`api-token`) — Strapi's current recommended method for
 * server-to-server access, confirmed against Strapi's own docs
 * (docs.strapi.io/cms/features/api-tokens): create one under Settings →
 * Global settings → API Tokens, then send `Authorization: Bearer <token>` on
 * every request. Strapi also supports a legacy JWT-via-login flow (`POST
 * /api/auth/local` with an email/password, from the Users & Permissions
 * plugin) — deliberately not implemented here; see the README for why.
 *
 * The instance has no fixed hostname — self-hosted, on-prem and Strapi Cloud
 * deployments all live at whatever URL the operator gives them — so
 * `endpoint` is collected here as a per-connection field, republished via
 * `afterConnect` onto `connection.display.endpoint` so action code (which
 * never sees the credential) can build request URLs.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description: "Authenticate with a Strapi API token (Admin panel: Settings → Global " +
    "settings → API Tokens → Create new API Token). Grant it Read-only, Full access, or " +
    "Custom permissions depending on which actions you need.",
  connectionLabel: "{{endpoint}}",
  fields: [
    {
      key: "endpoint",
      label: "Strapi URL",
      type: "string",
      required: true,
      placeholder: "https://my-project.strapiapp.com",
      hint: "Base URL of the Strapi instance, without a trailing slash.",
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Settings → Global settings → API Tokens → Create new API Token. Shown once at " +
        "creation (unless an encryption key is configured) — copy it immediately.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken: token } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { endpoint, apiToken: token } = credential as { endpoint?: string; apiToken?: string };
    if (!endpoint || !token) {
      return { ok: false, message: "credential missing endpoint / apiToken" };
    }
    const baseUrl = resolveBaseUrl({ endpoint });
    // Strapi API tokens don't map to a user, so there is no whoami endpoint to
    // call (`/api/users/me` belongs to the separate Users & Permissions JWT
    // flow and would 404/403 for a token-authenticated request regardless of
    // the token's validity). Instead this probes the built-in Media Library
    // list, paginated to one row to keep it cheap, and reads Strapi's own
    // authentication-vs-authorization split to interpret the result: a 401
    // means the token itself was rejected (invalid, revoked, or expired); any
    // other response — including a 403 from a token scoped away from Upload,
    // e.g. a Custom token granted only content-type permissions — means the
    // token authenticated successfully, which is exactly what this proves.
    // Confirmed against Strapi's docs: 401 is "who are you" (auth failure),
    // 403 is "you can't do that" (authz failure on an already-valid identity).
    const res = await ctx.fetch(`${baseUrl}/api/upload/files/page?pagination[pageSize]=1`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (res.status === 401) return { ok: false, message: "Strapi rejected the API token (401)" };
    if (res.status >= 500) return { ok: false, message: `Strapi returned ${res.status}` };
    return { ok: true };
  },

  afterConnect({ credential }) {
    const { endpoint } = credential as { endpoint?: string };
    return { endpoint };
  },
};

export default apiToken;
