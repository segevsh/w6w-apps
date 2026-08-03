import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * API Key (`apiKey`, header-located) — PandaDoc's **`API-Key` prefix**, not
 * `Bearer`.
 *
 * The scheme is unusual enough to be worth stating exactly. PandaDoc's own
 * reference (`developers.pandadoc.com/reference/api-key-authentication-process`)
 * gives it verbatim as:
 *
 * ```
 * Authorization: API-Key {{api_key}}
 * ```
 *
 * with a worked example — `Authorization: API-Key 3039ba033eb1410caa0a2227158d63c9d6502cd8`.
 * Verified live on 2026-08-03: `GET /public/v1/members/current` with a bogus key
 * answers `401 {"type":"authentication_error","detail":"Invalid key."}` — i.e.
 * the header form is parsed and the key is what is rejected. Sending the same
 * key as `Bearer` would be an OAuth2 access token, which it is not.
 *
 * **Why the API key and not OAuth2.** PandaDoc supports both. OAuth2
 * (`developers.pandadoc.com/reference/authentication-process`) exists for a
 * public application acting on behalf of *other people's* PandaDoc accounts,
 * and requires registering an application and getting it approved. The API key
 * is the right shape for a workflow host driving one account it controls, needs
 * no application registration, and does not expire. OAuth2 is a legitimate
 * second auth method for this app if a multi-tenant use case turns up; it is
 * deliberately not implemented on speculation.
 *
 * **What the key can do is what its owner can do.** PandaDoc ties a key to the
 * member who generated it, so its capabilities follow that user's role and
 * licence — and the key is deactivated if the user is removed from the
 * workspace. Two consequences worth knowing: mint keys from a stable
 * service-account-style user, and a `403` from an action usually means the
 * owner's role, not a broken key.
 *
 * **Sandbox vs production keys.** Both are minted on the Developer Dashboard's
 * Configuration page and both hit the same `api.pandadoc.com` host — a sandbox
 * key simply resolves to a sandbox workspace. A production key needs PandaDoc's
 * approval. Sandbox keys are rate-limited to 10 requests/minute across every
 * endpoint, so a Connection that is mysteriously slow is usually a sandbox key.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from the PandaDoc Developer Dashboard -> Configuration. Sent as `Authorization: API-Key <key>`.",
  connectionLabel: "{{email}}",
  apiKey: { in: "header", name: "Authorization", prefix: "API-Key " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "PandaDoc -> Developer Dashboard -> Configuration -> API keys. Sandbox keys work too (10 req/min).",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less. Note the
   * literal `API-Key ` prefix — PandaDoc rejects `Bearer`.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `API-Key ${apiKey}`;
    return request;
  },

  /**
   * `GET /public/v1/members/current` — the workspace whoami.
   *
   * The narrowest useful probe available: it needs no document, template or
   * contact to exist, and no permission beyond being a member (every licence
   * tier, down to Guest, can read its own membership). A read on `/documents`
   * would also work but can 403 on a role that cannot list other people's
   * documents, which would report a working credential as broken.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/members/current`, {
      headers: { accept: "application/json", authorization: `API-Key ${apiKey}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { detail?: unknown } | null;
      const detail = typeof body?.detail === "string" ? body.detail : undefined;
      return { ok: false, message: detail ?? `PandaDoc returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Records who the key belongs to and which workspace it addresses, so the
   * Connection can be told apart from another key on the same account. All of
   * it is display metadata — never the credential.
   */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/members/current`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    return {
      email: body.email,
      membershipId: body.membership_id,
      userId: body.user_id,
      workspace: body.workspace,
      workspaceName: body.workspace_name,
      role: body.role,
      userLicense: body.user_license,
    };
  },
};

export default apiKey;
