import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Token (`apiKey`) — the only auth mode the current MailerLite API
 * supports.
 *
 * The user pastes a token minted at Integrations -> MailerLite API -> Generate
 * new token. Every request signs by attaching the standard bearer header:
 *
 *   Authorization: Bearer <token>
 *
 * The Classic API (`api.mailerlite.com/api/v2`) uses a different scheme
 * entirely — an `X-MailerLite-ApiKey` header — and its keys are NOT
 * interchangeable with these. This app targets the current API only.
 *
 * Tokens are bound to the user who created them: if that user is removed from
 * the account, the token stops authenticating. That is a real cause of a
 * connection going dead without anyone rotating anything.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Paste an API token from Integrations -> MailerLite API -> Generate new token. Sent as `Authorization: Bearer <token>`.",
  apiKey: {
    in: "header",
    name: "Authorization",
    prefix: "Bearer ",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Token",
      type: "secret",
      required: true,
      hint:
        "MailerLite dashboard -> Integrations -> MailerLite API -> Generate new token. Shown once; store it immediately.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: token } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * MailerLite publishes no account/whoami endpoint on the current API, so the
   * liveness probe is the cheapest scope-free read it does publish: the
   * subscriber COUNT (`GET /subscribers?limit=0` returns `{"total": n}` and
   * no subscriber rows). An invalid token answers 401 `{"message":
   * "Unauthenticated."}`.
   */
  async test({ credential }, ctx) {
    const { apiKey: token } = credential as { apiKey?: string };
    if (!token) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/subscribers?limit=0`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `MailerLite returned ${res.status}` };
    return { ok: true };
  },
};

export default apiKey;
