import type { AuthDefinition } from "@w6w/types";
import { ACCEPT_HEADER, API_URL } from "../lib/client.ts";

/**
 * API Token (`apiKey`) — a PagerDuty REST API key, minted at
 * My Profile → User Settings → API Access, or (for an account-wide, non-user
 * key) Integrations → API Access Keys.
 *
 * PagerDuty's own scheme, NOT `Authorization: Bearer` — every request signs
 * by attaching `Authorization: Token token=<key>`. Verified against
 * PagerDuty's OpenAPI schema (https://github.com/PagerDuty/api-schema) and
 * n8n's `PagerDutyApi` credential + `GenericFunctions.ts`, which both build
 * exactly this header.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description: "Paste a REST API key from PagerDuty → My Profile → User Settings → API Access " +
    "(a personal key) or Integrations → API Access Keys (an account-wide key). Sent as " +
    "`Authorization: Token token=<key>`.",
  connectionLabel: "{{user.name}}",
  apiKey: { in: "header", name: "Authorization", prefix: "Token token=" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "My Profile → User Settings → API Access → Create API User Token.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Token token=${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    // GET /abilities needs no scope of its own and works for a user-level or
    // account-level key alike, unlike /users/me which rejects account-level
    // keys. https://github.com/PagerDuty/api-schema
    const res = await ctx.fetch(`${API_URL}/abilities`, {
      headers: { authorization: `Token token=${apiKey}`, accept: ACCEPT_HEADER },
    });
    if (!res.ok) return { ok: false, message: `PagerDuty returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    // Best-effort label data only: /users/me 400s for an account-level key
    // (it only resolves a user-level key or OAuth token), so a failure here
    // is expected for some connections and must not fail the connect flow.
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Token token=${apiKey}`, accept: ACCEPT_HEADER },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      user?: { id?: string; name?: string; email?: string };
    } | null;
    if (!body?.user) return {};
    return { user: { id: body.user.id, name: body.user.name, email: body.user.email } };
  },
};

export default apiToken;
