import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Acumbamail auth token — sent as the `auth_token` form parameter.
 *
 * The reference documents no header form, so `sign` merges the token into the
 * request's form body (`application/x-www-form-urlencoded`), preserving every
 * field the action already set. It is the only code that holds the token.
 *
 * ## The probe
 *
 * `POST /api/1/getLists/` — a read that needs only the token and returns list
 * names/ids (never the token). Measured 2026-10-06: with no token and with a
 * bogus token the API answers HTTP 401 with the 12-byte text body
 * `Unauthorized`. That is the vendor's only rejection signal, so `test`
 * classifies on that body *and* the 401; any other failure is reported as
 * itself (a 429 means the 5-requests-a-second limit, not a bad token).
 */
export const PROBE_FN = "getLists";

export interface AcumbamailCredential {
  authToken: string;
}

/** Merge `auth_token` into a form body, keeping any existing fields. */
export function signBody(body: string | Uint8Array | null | undefined, token: string): string {
  const raw = typeof body === "string" ? body : "";
  const params = new URLSearchParams(raw);
  params.set("auth_token", token);
  return params.toString();
}

const authToken: AuthDefinition = {
  key: "auth-token",
  type: "custom",
  displayName: "Auth Token",
  description:
    "The auth token shown under 'Customer identifier' on https://acumbamail.com/en/apidoc/ " +
    "while logged in. It is sent as the `auth_token` parameter of every call.",
  connectionLabel: "Acumbamail",
  fields: [
    {
      key: "authToken",
      label: "Auth Token",
      type: "secret",
      required: true,
      hint: "Log in to Acumbamail and open https://acumbamail.com/en/apidoc/ — the token is " +
        "under 'Customer identifier'. It is unique to your account; do not share it.",
    },
  ],

  sign({ request, credential }) {
    const token = ((credential as Partial<AcumbamailCredential>)?.authToken ?? "").trim();
    request.headers["content-type"] = "application/x-www-form-urlencoded";
    request.body = signBody(request.body, token);
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<AcumbamailCredential>)?.authToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing authToken" };

    const res = await ctx.fetch(`${API_BASE}/${PROBE_FN}/`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: signBody(null, token),
    });
    if (res.ok) return { ok: true };

    const text = (await res.text().catch(() => "")).trim().slice(0, 200);
    if (res.status === 401 && /^unauthori[sz]ed/i.test(text)) {
      return {
        ok: false,
        message: "Acumbamail rejected the auth token (401 Unauthorized). Copy it again from " +
          "https://acumbamail.com/en/apidoc/ under 'Customer identifier' and reconnect.",
      };
    }
    return {
      ok: false,
      message: `Acumbamail returned HTTP ${res.status} for ${PROBE_FN}${text ? `: ${text}` : ""}`,
    };
  },
};

export default authToken;
