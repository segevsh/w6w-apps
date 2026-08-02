import type { AuthDefinition } from "@w6w/types";
import { API_URL, type PostmarkErrorBody } from "../lib/client.ts";

/**
 * Server Token (`apiKey`, header-located) — scopes this app to a single
 * Postmark **server**, matching every action it declares (sending, message
 * search, bounces, templates, stats). Minted at postmarkapp.com → your
 * server → API Tokens tab. Sent as `X-Postmark-Server-Token` on every
 * request; verified against
 * Postmark's own docs (`postmarkapp.com/developer/api/overview`, fetched
 * 2026-08-02): "Used for requests that require server level privileges...
 * This token can be found on the API Tokens tab under your Postmark server."
 *
 * Postmark also has an `X-Postmark-Account-Token` for account-level
 * endpoints (list/create servers, domains, sender signatures) — deliberately
 * out of scope here; see `lib/client.ts` and README.md "Auth" for why.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Server Token",
  description:
    "Paste a Server API Token from your Postmark server -> API Tokens tab. Sent as the " +
    "`X-Postmark-Server-Token` header on every request.",
  connectionLabel: "{{server.Name}}",
  apiKey: { in: "header", name: "X-Postmark-Server-Token" },
  fields: [
    {
      key: "serverToken",
      label: "Server API Token",
      type: "secret",
      required: true,
      hint: "Postmark -> Servers -> (your server) -> API Tokens tab -> Server API tokens.",
    },
  ],

  sign({ request, credential }) {
    const { serverToken } = credential as { serverToken: string };
    request.headers["x-postmark-server-token"] = serverToken;
    return request;
  },

  /**
   * `GET /server` — returns the token's own server record. A server token
   * carries no finer-grained scopes to legitimately lack (unlike, say, a
   * Figma PAT), so this is both the cheapest read available and a genuine
   * whoami.
   */
  async test({ credential }, ctx) {
    const { serverToken } = credential as { serverToken?: string };
    if (!serverToken) return { ok: false, message: "credential missing serverToken" };
    const res = await ctx.fetch(`${API_URL}/server`, {
      headers: { accept: "application/json", "x-postmark-server-token": serverToken },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as PostmarkErrorBody | null;
      return { ok: false, message: body?.Message ?? `Postmark returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/server`, { headers: { accept: "application/json" } });
    if (!res.ok) return {};
    const server = await res.json().catch(() => ({})) as { ID?: number; Name?: string };
    return { server };
  },
};

export default apiKey;
