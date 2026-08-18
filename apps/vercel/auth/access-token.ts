import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Access Token (`apiKey`, bearer) — a Vercel token minted at
 * **Account Settings → Tokens**, scoped to your personal account or to a
 * team.
 *
 * Verified against Vercel's own OpenAPI document (https://openapi.vercel.sh/,
 * fetched 2026-08-18): the default security scheme is `bearerToken`,
 * `{"type": "http", "scheme": "bearer"}`, and Vercel's REST API docs state the
 * header as `Authorization: Bearer <TOKEN>`.
 *
 * `teamId` is collected here rather than repeated on every action. Vercel's
 * docs: "By default, you can access resources in your personal account. To
 * access resources owned by a team, append the Team ID as a query string."
 * Leaving it blank is therefore a valid, meaningful choice — the personal
 * account — not an omission, so the field is optional.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "apiKey",
  displayName: "Access Token",
  description: "Paste a Vercel access token from Account Settings → Tokens. Sent as " +
    "`Authorization: Bearer <token>`. Leave Team ID blank to act as your personal account.",
  connectionLabel: "{{user.username}}",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "token",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Account Settings → Tokens → Create. Its scope (personal or a team) is fixed at " +
        "creation time.",
    },
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      default: "",
      placeholder: "team_abc123",
      hint: "Optional. Leave blank to act as your personal account; find a team's ID under " +
        "Team Settings → General.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return { ok: false, message: "credential missing token" };
    // `GET /v2/user` is Vercel's whoami: it needs no team scope and no extra
    // permission, so it proves the token is live without depending on what it
    // can reach. A missing token answers 403 `{"error":{"code":"forbidden",
    // "missingToken":true}}` — verified live 2026-08-18.
    const res = await ctx.fetch(`${API_URL}/v2/user`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Vercel rejected the token (${res.status})` };
    }
    if (!res.ok) return { ok: false, message: `Vercel returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { token, teamId } = credential as { token: string; teamId?: string };
    const scope = { teamId: teamId?.trim() || undefined };
    // Best-effort label data: a failure here must not fail the connect flow.
    const res = await ctx.fetch(`${API_URL}/v2/user`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) return scope;
    const body = await res.json().catch(() => null) as {
      user?: { id?: string; username?: string; email?: string; name?: string };
    } | null;
    if (!body?.user) return scope;
    return {
      ...scope,
      user: {
        id: body.user.id,
        username: body.user.username,
        email: body.user.email,
        name: body.user.name,
      },
    };
  },
};

export default accessToken;
