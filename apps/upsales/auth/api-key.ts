import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Upsales API key — sent as the `token` **query parameter**.
 *
 * Verified 2026-10-06 against Upsales' Postman collection (every request is
 * `https://integration.upsales.com/api/v2/<path>?token=<key>`; the collection declares no
 * header scheme) and live probes of `integration.upsales.com`.
 *
 * ## There is no header form
 *
 * Upsales documents the key only as `?token=`. This app therefore stamps it onto the URL
 * in `sign` (the only hook handed the raw credential) and never in an Action. Because the
 * key lands in the URL, a host that logs request URLs will log it; there is nothing the
 * app can do about that — a header form is not documented, so none is attempted.
 *
 * ## Never decide from the status code
 *
 * Unsigned or rejected requests answer `401` with a **`text/plain` body `Unauthorized`**
 * — not JSON, not the `{"error":{...}}` envelope the API uses everywhere else. So the
 * probe below classifies the *body*: a JSON envelope carrying `data.id` is a live key,
 * anything else is not, whatever the status.
 *
 * ## The probe: `GET /self`
 *
 * `/self` is the signed-in user's own record (`id`, `email`, `name`, `client`, `features`…).
 * Verified from the documented response: it carries no key material, so it is safe to
 * store as a health result (unlike Mailjet's `/apikey` or Follow Up Boss's `/me`). It needs
 * no role beyond a valid key. Note it spells its envelope key `errors`, not `error`.
 */

export interface UpsalesCredential {
  apiKey: string;
}

export const PROBE_PATH = "/self";

/** The one place the wire format is built: the key becomes `?token=` on the URL. */
export function signUrl(url: string, apiKey: string): string {
  const u = new URL(url);
  u.searchParams.set("token", apiKey);
  return u.toString();
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "An Upsales API key, created by an administrator in Upsales under " +
    "Settings > API keys. Attached to every request as the `token` query parameter.",
  apiKey: { in: "query", name: "token" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Upsales > Settings > API keys (administrators only). Use a dedicated key for this " +
        "connection: limits are counted per key.",
    },
  ],

  /** Network-less: stamps `?token=` onto the URL and returns the request. */
  sign({ request, credential }) {
    const cred = credential as Partial<UpsalesCredential>;
    request.url = signUrl(request.url, cred.apiKey ?? "");
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<UpsalesCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(signUrl(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, key), {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    let body: { data?: { id?: unknown }; error?: { key?: string; msg?: string } | null } | null =
      null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }

    // The only success signal: a JSON envelope whose data is a user record.
    if (res.ok && body?.data && typeof body.data === "object" && body.data.id !== undefined) {
      return { ok: true };
    }

    if (body?.error?.key === "ThrottleLimit" || res.status === 429) {
      return {
        ok: false,
        message: "Upsales is rate-limiting this key (ThrottleLimit), so it could not be verified " +
          "right now. Retry shortly.",
      };
    }
    if (!body && /unauthorized/i.test(text)) {
      return {
        ok: false,
        message: `Upsales rejected the API key (${res.status} Unauthorized). Check it was copied ` +
          "exactly and has not been deleted under Settings > API keys.",
      };
    }
    if (res.ok) {
      return {
        ok: false,
        message: "Upsales answered 200 but not with a user record — the response is not the " +
          "documented /self shape.",
      };
    }
    const detail = body?.error?.key ? ` ${body.error.key}` : "";
    return { ok: false, message: `Upsales returned HTTP ${res.status}${detail} for ${PROBE_PATH}` };
  },
};

export default apiKey;
