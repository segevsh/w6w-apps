import type { AuthDefinition } from "@w6w/types";
import { API_PATH, apiHost, normalizeSubdomain } from "../lib/client.ts";

/**
 * Outseta server-side API key: `Authorization: Outseta <api_key>:<secret_key>`.
 *
 * Both halves are created together at Settings > Integrations > API Keys, and
 * the secret is shown once. The pair gives full access to the account, so it is
 * a `secret` field and only the `sign` hook ever reads it.
 *
 * The account subdomain is a credential FIELD, not an action parameter: a key
 * pair is valid on exactly one account, so pairing them keeps the host out of
 * every action's parameter list. It is republished as
 * `connection.display.subdomain` by `afterConnect`.
 *
 * Why `type: "custom"`: the wire format is a vendor-specific scheme word
 * (`Outseta`) over a `key:secret` pair. `bearer`/`basic` would describe a wire
 * format this app does not use.
 *
 * Bearer tokens (`POST /tokens` with a user's own login) are deliberately not
 * offered: they are for a logged-in end user, expire with the session, and the
 * docs forbid mixing the two schemes.
 */
interface Credential {
  subdomain?: string;
  apiKey?: string;
  apiSecret?: string;
}

/** The one place the wire value is built. */
export function authorizationValue(apiKey: string, apiSecret: string): string {
  return `Outseta ${apiKey}:${apiSecret}`;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API key",
  description:
    "Your Outseta account subdomain plus an API key and secret from Settings > Integrations > " +
    "API Keys. Sent as `Authorization: Outseta <key>:<secret>`.",
  connectionLabel: "{{subdomain}}.outseta.com",
  fields: [
    {
      key: "subdomain",
      label: "Account subdomain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint:
        "The part before `.outseta.com` in your admin URL — `acme` for `https://acme.outseta.com`. " +
        "Pasting the full URL also works.",
    },
    {
      key: "apiKey",
      label: "API key",
      type: "secret",
      required: true,
      hint: "Settings > Integrations > API Keys. A UUID-shaped identifier, not the secret.",
    },
    {
      key: "apiSecret",
      label: "API secret",
      type: "secret",
      required: true,
      hint:
        "The secret key shown once when the API key is created. Together with the key it grants " +
        "full access to the account — never use it in client-side code.",
    },
  ],

  /** The ONLY hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const { apiKey: key, apiSecret: secret } = credential as Credential;
    request.headers["authorization"] = authorizationValue(key ?? "", secret ?? "");
    return request;
  },

  /**
   * `GET /billing/planfamilies?limit=1&fields=Uid,Name` — plan family names
   * only; it never echoes the key. Success must carry the documented list
   * envelope (`metadata` + `items`), not just a 200.
   *
   * Measured 2026-10-06 against a real account with a made-up key: a rejected
   * pair is **403 with an empty body** (the docs say 401), an unknown subdomain
   * is **404 with an empty body**, and an unsigned or odd request gets a 403
   * Cloudflare HTML page. The bodies carry no vendor error code at all, so the
   * status is the only signal available; success is still decided by body shape.
   */
  async test({ credential }, ctx) {
    const { subdomain, apiKey: key, apiSecret: secret } = credential as Credential;
    if (!subdomain || !key || !secret) {
      return { ok: false, message: "credential missing subdomain / apiKey / apiSecret" };
    }
    let url: string;
    try {
      url = `https://${apiHost(subdomain)}${API_PATH}/billing/planfamilies?limit=1&fields=Uid,Name`;
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }

    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", authorization: authorizationValue(key, secret) },
    });
    const type = res.headers.get("content-type") ?? "";
    const text = await res.text().catch(() => "");

    if (res.ok) {
      try {
        const body = JSON.parse(text) as { metadata?: unknown; items?: unknown };
        if (body && typeof body === "object" && Array.isArray(body.items)) return { ok: true };
      } catch {
        // fall through
      }
      return { ok: false, message: "Outseta answered 200 but not with a list — wrong host?" };
    }
    if (/html/i.test(type) || /^\s*</.test(text)) {
      return {
        ok: false,
        message: `Outseta's edge returned an HTML error page (HTTP ${res.status}) — not the API`,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: "Outseta rejected the API key/secret (check both halves and the subdomain)",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `no Outseta account at "${normalizeSubdomain(subdomain)}.outseta.com"`,
      };
    }
    return { ok: false, message: `Outseta returned HTTP ${res.status}` };
  },

  /** Records the normalised subdomain. A subdomain is public, never a secret. */
  afterConnect({ credential }) {
    const { subdomain } = credential as Credential;
    return { subdomain: normalizeSubdomain(subdomain ?? "") };
  },
};

export default apiKey;
