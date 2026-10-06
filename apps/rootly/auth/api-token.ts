import type { AuthDefinition } from "@w6w/types";
import { API_URL, CONTENT_TYPE } from "../lib/client.ts";

/**
 * Rootly API token — `Authorization: Bearer <token>`.
 *
 * Verified 2026-10-06 against Rootly's OpenAPI document (`securitySchemes.bearer_auth`:
 * `type: http, scheme: bearer`) and live probes of `api.rootly.com`. A token is minted in
 * Rootly under Organization Settings > API Keys and is one of three kinds (Global, Team,
 * Personal), each carrying the permissions of the role it was created with — so a Team or
 * Personal token legitimately 403s on resources outside its reach.
 *
 * ## Probe: `GET /v1/users/me`
 *
 * It needs no role beyond a valid token, takes no parameters, and its body is the caller's
 * profile (email, name, time zone), never the token. The unauthenticated answer is
 * `401 {"errors":[{"title":"Invalid token","status":"401"}]}`, identical for a missing and a
 * wrong token, so the verdict is read from that body and not from the status alone. A 403 is
 * NOT a rejection: it is the authorization layer answering after the token authenticated, so
 * a restricted token still connects.
 */
export interface RootlyCredential {
  token: string;
}

export const PROBE_PATH = "/v1/users/me";

const REJECTED = /invalid token|unauthori[sz]ed|token.*(missing|expired|revoked)/i;

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "A Rootly API token from Organization Settings > API Keys. Global, Team and Personal tokens " +
    "all work; each can only do what its role allows.",
  connectionLabel: "Rootly",
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Rootly > Organization Settings > API Keys. Create one for this connection so it " +
        "can be revoked on its own.",
    },
  ],

  /** The only hook handed the raw credential; runs network-less. */
  sign({ request, credential }) {
    const { token } = credential as Partial<RootlyCredential>;
    request.headers["authorization"] = `Bearer ${(token ?? "").trim()}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { token } = credential as Partial<RootlyCredential>;
    if (!(token ?? "").trim()) return { ok: false, message: "credential missing the API token" };

    const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
      method: "GET",
      headers: { accept: CONTENT_TYPE, authorization: `Bearer ${token!.trim()}` },
    });
    if (res.ok || res.status === 403) return { ok: true };

    const text = await res.text().catch(() => "");
    if (res.status === 401 || REJECTED.test(text)) {
      return {
        ok: false,
        message: "Rootly rejected the API token (HTTP " + res.status +
          "). Check it was copied exactly and has not been revoked.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Rootly rate-limited the token check (429); try again" };
    }
    return { ok: false, message: `Rootly answered HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default apiToken;
