import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

interface StoredCredential {
  apiToken: string;
}

/**
 * API token — sent as the `X-API-Token` header. Created in Mixmax under Settings > Integrations
 * (app.mixmax.com/dashboard/settings/personal/integrations); shown once.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Create a token in Mixmax under Settings > Integrations > API. Sent as the `X-API-Token` header.",
  connectionLabel: "Mixmax",
  apiKey: { in: "header", name: "X-API-Token" },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Settings > Integrations > API in Mixmax. The token is shown only once.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as StoredCredential;
    request.headers["x-api-token"] = apiToken;
    return request;
  },

  /**
   * Probe: `GET /users/me` answers `{"_id": "<user id>"}` — the user id only, never the token.
   * Verdict from the BODY: a 2xx must carry a string `_id`; a rejection is Mixmax's
   * `{"message": "Invalid API token provided"}` / `"No API token provided; …"`, surfaced verbatim.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<StoredCredential>;
    if (!cred.apiToken) return { ok: false, message: "credential missing apiToken" };
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/users/me`, {
        headers: { "x-api-token": cred.apiToken, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Mixmax API: ${e}` };
    }
    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Mixmax */ }

    if (res.ok) {
      return typeof (body as { _id?: unknown } | null)?._id === "string" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /users/me — no user id in it`,
      };
    }
    if (typeof (body as { message?: unknown } | null)?.message !== "string") {
      return {
        ok: false,
        message:
          `Mixmax returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    const text = errorText(body, raw);
    return {
      ok: false,
      message: res.status >= 500 ? `Mixmax is erroring (${res.status}): ${text}` : text,
    };
  },
};

export default apiToken;
