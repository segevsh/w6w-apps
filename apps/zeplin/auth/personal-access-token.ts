import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

/**
 * Zeplin personal access token (or any OAuth access token) — sent as `Authorization: Bearer <token>`
 * (verified 2026-10-06: the rate-limit docs show `-H "Authorization: Bearer {token}"`, and an
 * unauthenticated call answers `{"message":"invalid_token","detail":"Authorization header is
 * missing"}`). Create one in Zeplin under Profile > Developer > Personal access tokens. The OAuth
 * authorization-code flow is not modelled here: it needs a registered Zeplin app with its own
 * client id and secret.
 *
 * ## Probe: `GET /users/me`
 *
 * Needs a valid token and returns the caller's own `{ id, email, username, emotar, avatar,
 * last_seen }` — never the token. The verdict comes from the body: a 2xx must carry the user `id`
 * to count as live; a rejection is recognised from the vendor's own `message: "invalid_token"`
 * (status 401 is the hint). A 429 means the token was accepted but the rate limit is spent.
 */
export interface ZeplinCredential {
  apiKey: string;
}

export const ME_PATH = "/users/me";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${ME_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "A Zeplin personal access token (Zeplin web app > Profile > Developer > Personal access tokens). It is sent as a Bearer token on every request and acts as you, with your access to projects and styleguides.",
  connectionLabel: "Zeplin",
  fields: [
    {
      key: "apiKey",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint:
        "Copy it when Zeplin shows it; it cannot be read again. Limit: 200 requests per minute per user.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as Partial<ZeplinCredential>;
    request.headers["authorization"] = `Bearer ${(apiKey ?? "").trim()}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as Partial<ZeplinCredential>;
    if (!(apiKey ?? "").trim()) return { ok: false, message: "credential missing the token" };

    const request = await personalAccessToken.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    const text = await res.text().catch(() => "");
    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }

    const message = typeof body?.message === "string" ? body.message : "";
    if (res.ok && typeof body?.id === "string") return { ok: true };
    if (/invalid_token/i.test(message) || res.status === 401) {
      return {
        ok: false,
        message: `Zeplin rejected the token (${res.status}${
          message ? ` ${message}` : ""
        }). Check it was copied exactly and has not been revoked.`,
      };
    }
    if (res.status === 429) {
      return { ok: true, message: "Token accepted, but the Zeplin rate limit is currently spent" };
    }
    return {
      ok: false,
      message: res.ok
        ? `Zeplin answered ${res.status} for ${ME_PATH} without a user id`
        : `Zeplin answered HTTP ${res.status} for ${ME_PATH}: ${errorText(text)}`,
    };
  },
};

export default personalAccessToken;
