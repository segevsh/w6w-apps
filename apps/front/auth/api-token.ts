import type { AuthDefinition } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/**
 * Front API token — a **JWT**, sent as `Authorization: Bearer <token>`.
 *
 * ## Two failures that look identical and are not
 *
 * Measured against `api2.frontapp.com` 2026-08-18, Front distinguishes them in
 * the body while answering `401` for both:
 *
 *   - a token that is a well-formed JWT but unknown or revoked —
 *     `{"_error":{"status":401,"title":"Unauthenticated","message":"Invalid token"}}`
 *   - **no** `Authorization` header, or a value that is not a JWT at all —
 *     `{"_error":{…,"message":"JSON Web Token error"}}`
 *
 * "Your token is wrong" and "your token never arrived" have different fixes —
 * one is a paste error in Front's settings, the other is a broken connection —
 * so `test` reports which one happened rather than a generic 401.
 *
 * ## Scopes are granular, and a missing one is not a login problem
 *
 * Front's own spec annotates every operation with an `x-required-scopes` list —
 * 55 distinct scopes across 147 paths. A token created without, say,
 * `messages:send` authenticates perfectly and then fails only on the one call
 * that needs it. `test` therefore proves *identity*, not capability: it cannot
 * tell you a scope is missing, and pretending otherwise would be worse than
 * silence. The README lists the scopes this app's actions need.
 *
 * ## Why not OAuth
 *
 * Front supports OAuth 2.0, but only for a **registered Front partner app** —
 * client credentials are issued by Front to listed integration partners, not
 * created inside a customer's own account. A token any Front admin can mint in
 * Settings is the credential a workflow can actually get, so it is the one
 * offered here.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "A Front API token from Settings → Developers → API tokens. Sent as a Bearer token; the " +
    "scopes ticked when the token is created decide which actions work.",
  connectionLabel: "{{company}}",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Front → Settings → Developers → API tokens → Create API token. It is a JWT, so it " +
        "is long and starts with `eyJ`.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${apiToken}`;
    return request;
  },

  /**
   * `GET /me` is the cheapest call that proves the token works, and it needs no
   * scope at all — every token can read its own identity. It answers with the
   * **company**, not the teammate: `{"id":"cmp_…","name":"…"}`. That is the
   * right thing to show on a Connection, because a Front API token belongs to
   * the company rather than to a person.
   */
  async test({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${BASE_URL}/me`, {
      headers: { authorization: `Bearer ${apiToken}`, accept: "application/json" },
    });
    if (res.status === 401) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        message: body.includes("JSON Web Token error")
          ? "Front did not receive a usable JWT — the token is malformed or never arrived"
          : "Front rejected the token (401) — it is unknown, revoked, or from another company",
      };
    }
    if (!res.ok) return { ok: false, message: `Front returned ${res.status}` };

    const body = await res.json().catch(() => null) as { name?: string; id?: string } | null;
    return { ok: true, message: body?.name ? `connected to ${body.name}` : undefined };
  },

  /** Records which Front company this connection talks to. Never the token. */
  async afterConnect({ credential }, ctx) {
    const { apiToken } = credential as { apiToken: string };
    const res = await ctx.fetch(`${BASE_URL}/me`, {
      headers: { authorization: `Bearer ${apiToken}`, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as { name?: string; id?: string } | null;
    return { company: body?.name, companyId: body?.id };
  },
};

export default apiToken;
