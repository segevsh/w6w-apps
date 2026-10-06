import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, vendorError } from "../lib/client.ts";

/**
 * Breezy access token — `Authorization: <token>`, applied in `sign`.
 *
 * Verified 2026-10-06 against `developer.breezy.hr/reference/authorization` and the
 * OpenAPI `securitySchemes` (`apiKey`, header `Authorization`): "Both header forms are
 * accepted for PATs and session tokens: `Authorization: Bearer <token>` and the bare
 * `Authorization: <token>`". The bare form is what the vendor's own curl examples use, so
 * that is what is sent.
 *
 * Two token kinds, one field:
 *
 * - **Personal Access Token** (recommended): `breezy_pat_…`, created under My Settings > API
 *   Keys. Long-lived and not killed by signing out.
 * - **Session token**: the `access_token` from `POST /v3/signin` (email + password). It lasts
 *   30 days from last use and dies on `/signout`.
 *
 * The password flow is deliberately NOT modelled: `/signin` takes an email and password, and a
 * credential that holds a password and trades it for a token would have to call the network
 * from `sign`, which the contract forbids. Paste a PAT, or a session token you minted yourself.
 *
 * ## Probe: `GET /user`
 *
 * Returns the token owner's profile (`_id`, `email_address`, `name`…), never the token, and
 * needs no company scope. A rejected token is **HTTP 400** with
 * `{"error":{"type":"invalidAccessToken"}}` (measured: a bare bogus value, a `Bearer
 * breezy_pat_…` bogus value and no header all answer 400), so the verdict is read from
 * `error.type`, not the status.
 */
export interface BreezyCredential {
  accessToken: string;
}

export const PROBE_PATH = "/user";
export const TOKEN_ERRORS = new Set(["invalidAccessToken", "missingAccessToken"]);

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${PROBE_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "apiKey",
  displayName: "Access Token",
  description: "A Breezy Personal Access Token (My Settings > API Keys) or a session token from " +
    "POST /v3/signin, sent in the `Authorization` header.",
  connectionLabel: "Breezy HR ({{user}})",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "accessToken",
      label: "Access token",
      type: "secret",
      required: true,
      hint: "Breezy > your avatar > My Settings > API Keys > Create API Key. Starts with " +
        "`breezy_pat_` and is shown once.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as Partial<BreezyCredential>;
    request.headers["authorization"] = (accessToken ?? "").trim();
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken: token } = credential as Partial<BreezyCredential>;
    if (!(token ?? "").trim()) return { ok: false, message: "credential missing the access token" };

    const request = await accessToken.sign!({ request: probeRequest(), credential }, ctx);
    let res: Response;
    try {
      res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    } catch (e) {
      return { ok: false, message: `could not reach the Breezy HR API: ${e}` };
    }
    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }
    const err = vendorError(body);

    if (res.ok) {
      const id = (body as { _id?: unknown } | undefined)?._id;
      return typeof id === "string" && id !== "" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /user — no user in it`,
      };
    }
    if (err?.type && TOKEN_ERRORS.has(err.type)) {
      return {
        ok: false,
        message: `Breezy HR rejected the access token (${err.type}). Create a Personal Access ` +
          "Token under My Settings > API Keys.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Breezy HR rate-limited the token check (429); try again" };
    }
    if (res.status >= 500) {
      return { ok: false, message: `Breezy HR is erroring (HTTP ${res.status})` };
    }
    return {
      ok: false,
      message: `Breezy HR answered HTTP ${res.status}${
        err?.type ? ` (${err.type}${err.message ? `: ${err.message}` : ""})` : ""
      } for ${PROBE_PATH}`,
    };
  },

  /** Records the token owner's name for the connection label. */
  async afterConnect({ credential }, ctx) {
    let user = "Breezy HR";
    try {
      const request = await accessToken.sign!({ request: probeRequest(), credential }, ctx);
      const res = await ctx.fetch(request.url, {
        method: request.method,
        headers: request.headers,
      });
      if (res.ok) {
        const body = await res.json() as { name?: string; email_address?: string };
        user = body.name || body.email_address || user;
      }
    } catch { /* the label falls back to "Breezy HR" */ }
    return { user };
  },
};

export default accessToken;
