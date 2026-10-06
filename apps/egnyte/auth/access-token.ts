import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Egnyte OAuth 2.0 access token (`bearer`).
 *
 * Egnyte's Public API takes `Authorization: Bearer <token>` against the
 * customer's own host (`https://{domain}.egnyte.com/pubapi/...`). Tokens are
 * issued by any of Egnyte's OAuth flows (or generated for an internal app via
 * the developer portal) and last 30 days; this app stores the resulting token
 * and does not run the authorization dance itself.
 *
 * The domain is collected here: it identifies the account, so it belongs to
 * the Connection. `afterConnect` echoes it onto the connection's display data,
 * which is where the client reads it from.
 *
 * Probe: `GET /pubapi/v1/userinfo` returns `{id, username, first_name,
 * last_name}` — the caller's identity, never the token, so it is safe to echo
 * into the connection label.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "An Egnyte OAuth access token and your Egnyte domain. Tokens last 30 days and are revoked when the user changes their password.",
  connectionLabel: "{{user.username}} ({{domain}})",
  fields: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.egnyte.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "An OAuth 2.0 access token for the domain, with the scopes the actions you use need.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { domain, accessToken } = credential as { domain?: string; accessToken?: string };
    if (!domain || !accessToken) {
      return { ok: false, message: "credential missing domain or accessToken" };
    }
    const res = await ctx.fetch(`${baseUrl(domain)}/v1/userinfo`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    // Classify by body, not status alone: a real answer is the userinfo shape.
    const body = await res.json().catch(() => null) as { username?: string } | null;
    if (res.ok && body && typeof body.username === "string") return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Egnyte rejected the token (${res.status})` };
    }
    return { ok: false, message: `Egnyte returned ${res.status} without a userinfo body` };
  },

  /** Records the domain (and who the token belongs to) on the connection. */
  async afterConnect({ credential }, ctx) {
    const { domain, accessToken } = credential as { domain?: string; accessToken?: string };
    if (!domain) return {};
    const res = await ctx.fetch(`${baseUrl(domain)}/v1/userinfo`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { domain };
    const user = await res.json().catch(() => null) as Record<string, unknown> | null;
    return user ? { domain, user } : { domain };
  },
};

export default accessToken;
