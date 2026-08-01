import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Coda's whole API is a single Bearer token generated per-account at
 * coda.io/account under API Settings — no OAuth flow, no scopes. `GET
 * /whoami` is the documented way to verify a token and resolve the acting
 * account, so it doubles as both the credential-liveness probe and the
 * connection label source.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Paste an API token generated at coda.io/account under API Settings -> Generate API token.",
  connectionLabel: "{{name}}",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "coda.io/account -> API Settings -> Generate API token.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${apiToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };
    const res = await ctx.fetch(`${API_URL}/whoami`, {
      headers: { authorization: `Bearer ${apiToken}` },
    });
    if (!res.ok) return { ok: false, message: `Coda returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/whoami`);
    if (!res.ok) return {};
    // Only `name` is asserted here — it is the one field every Coda /whoami
    // example in the vendor's own docs shows; anything else in the payload is
    // passed through untyped rather than guessed at.
    const who = await res.json() as { name?: string } & Record<string, unknown>;
    return { name: who.name };
  },
};

export default apiToken;
