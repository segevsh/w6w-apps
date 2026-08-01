import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Cloudflare API Tokens — the modern, scoped auth method, and the one
 * Cloudflare's own docs recommend: "API Token is the preferred authorization
 * scheme for interacting with the Cloudflare API."
 * https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
 *
 * The legacy Global API Key + Email scheme is deliberately NOT implemented
 * here — see README.md "Auth methods" for why.
 */
const auth: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "Cloudflare API Token",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Create one at My Profile → API Tokens → Create Token (developers.cloudflare.com).",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${apiToken}`;
    return request;
  },

  /**
   * Cloudflare's documented way to validate a token: it returns the token's
   * own status (`active` | `disabled` | `expired`) rather than merely
   * reflecting a 2xx, and needs no scope beyond what every token carries.
   * https://developers.cloudflare.com/api/resources/user/subresources/tokens/methods/verify/
   */
  async test({ credential: _credential }, ctx) {
    const res = await ctx.fetch(`${API_BASE}/user/tokens/verify`, {
      headers: { "content-type": "application/json" },
    });
    const body = await res.json().catch(() => undefined) as
      | { success?: boolean; result?: { status?: string }; errors?: { message: string }[] }
      | undefined;

    if (!res.ok || !body?.success) {
      const detail = body?.errors?.map((e) => e.message).join("; ") ?? `HTTP ${res.status}`;
      return { ok: false, message: `Token verification failed: ${detail}` };
    }
    if (body.result?.status !== "active") {
      return { ok: false, message: `Token status is "${body.result?.status ?? "unknown"}"` };
    }
    return { ok: true };
  },
};

export default auth;
