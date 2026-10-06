import type { AuthDefinition } from "@w6w/types";
import { API_URL, type Meta } from "../lib/client.ts";

/**
 * API key — Klipfolio takes the key in a `kf-api-key` request header. Keys are
 * generated from My Profile (or Users, for an admin with `user.manage`); the
 * Admin and Editor roles can generate them by default.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Generate a key in Klipfolio under My Profile (or Users, as an administrator). Sent as the `kf-api-key` header.",
  apiKey: { in: "header", name: "kf-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Klipfolio → My Profile → API key. Requests act as the user who owns the key, with that user's role permissions.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["kf-api-key"] = key;
    return request;
  },

  /**
   * Probe: `GET /profile`, the authenticated user's own record. Its body holds
   * id, company, name, email and login dates — never the key. The verdict is
   * read from the BODY (`meta.error_code`): `auth_fail` is a rejected key,
   * `auth_not_provided` a missing one; both are HTTP 401.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/profile`, {
        headers: { "kf-api-key": key, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Klipfolio API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: { meta?: Meta; data?: { id?: string } } | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Klipfolio */ }

    if (res.ok) {
      return body?.data?.id ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /profile — no user record`,
      };
    }
    const meta = body?.meta;
    if (!meta?.error_code && !meta?.error_desc) {
      return {
        ok: false,
        message:
          `Klipfolio returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    if (res.status >= 500) {
      return {
        ok: false,
        message: `Klipfolio is erroring (${res.status}): ${meta.error_desc ?? ""}`,
      };
    }
    return {
      ok: false,
      message: meta.error_desc ?? meta.error_code ?? `Klipfolio returned ${res.status}`,
    };
  },
};

export default apiKey;
