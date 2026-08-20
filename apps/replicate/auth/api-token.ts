import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API token as a bearer token — what the spec's only security scheme declares,
 * spelling out the prefix: *"The token must be prefixed by `Bearer`, followed
 * by a space and the token value."*
 *
 * Replicate tokens begin `r8_`. There is no OAuth flow and no scoped token, so
 * the token can do everything the account can — including create predictions,
 * which cost money. That is worth stating rather than leaving someone to
 * discover it from a bill.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "A Replicate API token from replicate.com/account/api-tokens. Sent as a bearer token. " +
    "Replicate has no scoped tokens — this one can run any model on the account.",
  connectionLabel: "{{username}}",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Starts `r8_`. Found at replicate.com/account/api-tokens.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${apiToken}`;
    return request;
  },

  /**
   * `GET /account` is the narrowest call that proves the token works, and it
   * returns the account it belongs to — which matters here because a token
   * spends money, and knowing whose is not a nicety.
   */
  async test({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_URL}/account`, {
      headers: { authorization: `Bearer ${apiToken}`, accept: "application/json" },
    });
    if (res.status === 401) {
      return { ok: false, message: "Replicate rejected the token (401)" };
    }
    if (!res.ok) return { ok: false, message: `Replicate returned ${res.status}` };
    return { ok: true };
  },

  /** Publishes whose account this is. Never the token. */
  async afterConnect(_input, ctx) {
    const { credential } = _input as { credential: { apiToken?: string } };
    if (!credential.apiToken) return {};
    try {
      const res = await ctx.fetch(`${API_URL}/account`, {
        headers: { authorization: `Bearer ${credential.apiToken}`, accept: "application/json" },
      });
      if (!res.ok) return {};
      const body = await res.json() as { username?: string; type?: string };
      return { username: body.username, accountType: body.type };
    } catch {
      return {};
    }
  },
};

export default apiToken;
