import type { AuthDefinition } from "@w6w/types";
import { API_URL, type ClockodoBody, messageOf } from "../lib/client.ts";

/** The identification header the API demands on every API-key request: `<app>;<contact email>`. */
export function externalApplication(email: string): string {
  return `w6w;${email}`;
}

/**
 * Clockodo API key — a user's own email plus their personal API key (Clockodo → Personal data).
 * Sent as the Clockodo headers `X-ClockodoApiUser` / `X-ClockodoApiKey`, plus the mandatory
 * `X-Clockodo-External-Application` identifier (`w6w;<email>`; the API requires an app name and a
 * technical contact address on every API-key request). Changing the Clockodo password
 * invalidates the key.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "Email & API key",
  description:
    "A Clockodo user's email address and personal API key (Clockodo → Personal data). Calls act with that user's access rights. Changing the Clockodo password invalidates the key.",
  connectionLabel: "Clockodo ({{email}})",
  fields: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "The email address of the Clockodo user the key belongs to.",
    },
    {
      key: "apiKey",
      label: "API key",
      type: "secret",
      required: true,
      hint: "Clockodo → Personal data → API key.",
    },
  ],

  sign({ request, credential }) {
    const { email, apiKey: key } = credential as { email: string; apiKey: string };
    request.headers["x-clockodoapiuser"] = email;
    request.headers["x-clockodoapikey"] = key;
    request.headers["x-clockodo-external-application"] = externalApplication(email);
    return request;
  },

  /**
   * Probe: `GET /v4/users/me` — the caller's own user record (id, name, role), which does not
   * contain the API key. Measured 2026-10-06: a missing and a wrong credential are the same
   * `401 {"errors":[{"type":"General","message":"Authentication failed",...}]}`, so the verdict is
   * the documented `data` object on success and the vendor's own error on a refusal, never the
   * HTTP status alone.
   */
  async test({ credential }, ctx) {
    const { email, apiKey: key } = credential as { email?: string; apiKey?: string };
    if (!email) return { ok: false, message: "credential missing email" };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/v4/users/me`, {
        headers: {
          "x-clockodoapiuser": email,
          "x-clockodoapikey": key,
          "x-clockodo-external-application": externalApplication(email),
          accept: "application/json",
        },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Clockodo API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: (ClockodoBody & { data?: unknown }) | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Clockodo */ }

    if (res.ok && body?.data && typeof body.data === "object") return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Clockodo rejected the credential: ${messageOf(body) ?? res.status}`,
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message: "Clockodo rate limited the probe; the key could not be verified",
      };
    }
    return {
      ok: false,
      message: `unexpected ${res.status} from GET /v4/users/me${
        messageOf(body) ? `: ${messageOf(body)}` : ""
      }; the request may not have reached the API`,
    };
  },
};

export default apiKey;
