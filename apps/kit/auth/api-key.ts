import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Key (`apiKey`) — Kit API v4's simplest credential.
 *
 * Kit v4 supports two credentials: this API key and a full OAuth 2.0
 * authorization-code flow (with a PKCE variant), documented at
 * <https://developers.kit.com/api-reference/authentication>. We ship the API
 * key because it needs no app registration, no redirect URI and no client
 * secret — the user pastes a key and is done. OAuth 2.0 remains the right
 * choice for a multi-creator app listed in the Kit App Store, and it also
 * carries a higher allowance (Kit documents 600 requests / 60s for OAuth
 * versus 120 for an API key); add it as a second `AuthDefinition` if that
 * headroom or the App Store listing is ever needed.
 *
 * The key rides in an `X-Kit-Api-Key` HEADER. The retired v3 API took
 * `api_key`/`api_secret` as QUERY PARAMETERS instead — a materially worse
 * posture, since query strings land in access logs, proxy caches and
 * `Referer` headers. That alone justifies v4 even before the deprecation.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste a v4 API key from Kit → Settings → Developer. Sent verbatim as an `X-Kit-Api-Key` header.",
  connectionLabel: "{{account.name}}",
  apiKey: {
    in: "header",
    name: "X-Kit-Api-Key",
    prefix: "",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "kit.com → Settings → Developer → API Key. Must be a V4 key; V3 keys are not accepted.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["X-Kit-Api-Key"] = key;
    return request;
  },

  /**
   * `GET /v4/account` is Kit's documented "which account am I" call and the
   * cheapest read an API key can make — it needs no extra scope, so it never
   * reports a working credential as broken.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/account`, {
      headers: { "X-Kit-Api-Key": key, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Kit returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/account`, {
      headers: { "X-Kit-Api-Key": key, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      user?: { email?: string };
      account?: { id?: number; name?: string; plan_type?: string; primary_email_address?: string };
    } | null;
    if (!body) return {};
    return {
      account: {
        id: body.account?.id,
        name: body.account?.name,
        planType: body.account?.plan_type,
        email: body.account?.primary_email_address ?? body.user?.email,
      },
    };
  },
};

export default apiKey;
