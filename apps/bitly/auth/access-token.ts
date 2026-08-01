import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Bitly's simplest credential is a "Generic Access Token" generated per-account
 * at bitly.com/settings/api — a single long-lived Bearer token, no OAuth flow.
 * (Bitly also supports full OAuth2 for multi-tenant apps, but its exact
 * authorize/token URLs weren't confirmed against the vendor's own docs during
 * this build, so only the token auth is implemented here — see README.)
 *
 * `GET /v4/user` is documented as returning the authenticated user's own
 * account info, so it doubles as both the credential-liveness probe and the
 * connection label source.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Generic Access Token",
  description:
    "Paste a Generic Access Token generated at bitly.com/settings/api -> Generic Access Token.",
  connectionLabel: "{{login}}",
  fields: [
    {
      key: "accessToken",
      label: "Generic Access Token",
      type: "secret",
      required: true,
      hint: "bitly.com/settings/api -> Generic Access Token.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/user`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Bitly returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/user`);
    if (!res.ok) return {};
    // Only `login` is asserted here — the one account-identifying field
    // corroborated across Bitly's own docs and independent client libraries;
    // anything else in the payload is passed through untyped rather than
    // guessed at.
    const who = await res.json() as { login?: string } & Record<string, unknown>;
    return { login: who.login };
  },
};

export default accessToken;
