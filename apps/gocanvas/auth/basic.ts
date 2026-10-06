import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, extractGoCanvasError } from "../lib/client.ts";

/**
 * GoCanvas user login over HTTP Basic (`Authorization: Basic base64(login:password)`).
 *
 * Verified against the v3 reference ("Authentication: Basic", read 2026-10-06):
 * "GoCanvas supports HTTP basic auth to turn your existing username and password
 * into API access". The reference also shows `?username=&password=` query
 * parameters in its Ruby sample; this app never uses them - a host logs request
 * URLs and does not log request headers, so the credential only reaches the wire
 * as a header, built in {@link basicHeader}.
 *
 * ## Why not OAuth
 *
 * v3 also has OAuth 2.0 (`POST /api/v3/oauth/token`, client credentials with a
 * 2-hour token, or PKCE). Both need an OAuth application the customer creates in
 * their GoCanvas profile and, for client credentials, a token exchange this app
 * has no hook to schedule. Basic is the scheme every GoCanvas user already has.
 *
 * ## The probe is `GET /api/v3/me`
 *
 * It needs the credential, returns the caller's own profile (id, name, login,
 * company) and never the password. Measured live 2026-10-06: with no credential
 * and with a wrong Basic pair it answers a BYTE-IDENTICAL
 * `401 {"error":"You must be logged in to access this section of the site."}`,
 * so "missing" and "wrong" cannot be told apart - the message says so. The
 * verdict is read from the BODY (a numeric `id`), never the status alone.
 */

export interface GoCanvasCredential {
  username: string;
  password: string;
}

export const PROBE_PATH = "/me";

/** UTF-8 safe Base64 - `btoa` alone throws on a password with a non-Latin1 character. */
function base64(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** The one place the wire format is built; `sign` and `test` both use it. */
export function basicHeader(credential: Partial<GoCanvasCredential>): string {
  return `Basic ${base64(`${credential.username ?? ""}:${credential.password ?? ""}`)}`;
}

interface MeBody {
  id?: number;
  login?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
}

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "GoCanvas login",
  description:
    "The login (email) and password of a GoCanvas user. Use a dedicated API user whose role " +
    "carries only the rights the workflow needs.",
  connectionLabel: "GoCanvas ({{company}})",
  fields: [
    {
      key: "username",
      label: "Login (email)",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The GoCanvas user's login - the email address they sign in with.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      required: true,
      row: "creds",
      hint: "That user's GoCanvas password. Single-sign-on-only users have no password and " +
        "cannot use Basic auth.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    request.headers["authorization"] = basicHeader(credential as Partial<GoCanvasCredential>);
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<GoCanvasCredential>;
    if (!cred?.username?.trim() || !cred?.password) {
      return { ok: false, message: "credential needs both a login and a password" };
    }

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: basicHeader(cred) },
    });
    const text = await res.text().catch(() => "");
    let body: MeBody | null = null;
    try {
      body = JSON.parse(text) as MeBody;
    } catch { /* not JSON */ }

    if (res.ok && typeof body?.id === "number") return { ok: true };
    if (res.ok) {
      return {
        ok: false,
        message: "GoCanvas answered 200 but not with a user profile; the response is not the " +
          "documented /me shape.",
      };
    }
    const detail = extractGoCanvasError(text).slice(0, 200);
    if (res.status === 401) {
      return {
        ok: false,
        message: `GoCanvas rejected the login (401${detail ? ` ${detail}` : ""}). A wrong ` +
          "password and a missing one look identical to the API - check the email, the " +
          "password, and that the user is not SSO-only or disabled.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `GoCanvas refused the request (403${detail ? ` ${detail}` : ""})`,
      };
    }
    return { ok: false, message: `GoCanvas returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /** Label the connection with the company name; silent on failure. */
  async afterConnect({ credential }, ctx) {
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: {
          accept: "application/json",
          authorization: basicHeader(credential as Partial<GoCanvasCredential>),
        },
      });
      if (!res.ok) return {};
      const body = await res.json() as MeBody;
      return body.company_name ? { company: body.company_name } : {};
    } catch {
      return {};
    }
  },
};

export default basic;
