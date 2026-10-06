import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorCode, formatSignWellError } from "../lib/client.ts";

/**
 * API key (`apiKey`), sent as `X-Api-Key` — SignWell's only documented auth mechanism, confirmed
 * against the spec's `securitySchemes`:
 *
 *     api_key: { type: apiKey, in: header, name: X-Api-Key }
 *
 * The key comes from SignWell → Settings → API.
 *
 * ## The auth probe, and why it never echoes the key
 *
 * `GET /api/v1/me` returns the membership (`role`), the `user` (id, name, email), the `account`
 * and `workspace` (plan tier, template counts, preferences) and the `contact`. Read against the
 * spec's response schema: not one field is the key. It is also scope-free — every issued key can
 * call it.
 *
 * ## Classified from the body, not the status
 *
 * Measured live 2026-10-06, both answer HTTP 401 with the same envelope but different codes:
 *
 *     no key     → meta.error "missing_authorization_key_error"
 *     wrong key  → meta.error "api_key_unauthorized_error"
 *
 * A pass requires the documented `/me` shape (an object carrying `user` and `account`); a 200
 * that is not that shape is a failure, not a pass.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A SignWell API key from Settings → API. Sent as the X-Api-Key header.",
  connectionLabel: "SignWell",
  apiKey: { in: "header", name: "X-Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "SignWell → Settings → API.",
    },
  ],

  /** The only hook that sees the credential. */
  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-api-key"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as { apiKey?: string })?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/me`, {
      headers: { accept: "application/json", "x-api-key": key },
    });
    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch { /* handled below */ }

    const me = body as { user?: unknown; account?: unknown } | undefined;
    if (res.ok && typeof me?.user === "object" && typeof me?.account === "object") {
      return { ok: true };
    }
    if (res.ok) {
      return { ok: false, message: "GET /me answered 200 but not with SignWell's account shape" };
    }
    const code = errorCode(body);
    if (code === "api_key_unauthorized_error") {
      return { ok: false, message: "SignWell rejected the API key (api_key_unauthorized_error)" };
    }
    return { ok: false, message: formatSignWellError(res.status, "GET", "/me", text) };
  },
};

export default apiKey;
