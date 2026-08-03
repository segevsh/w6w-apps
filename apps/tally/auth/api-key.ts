import type { AuthDefinition } from "@w6w/types";
import { BASE_URL, VERSION_HEADER, VERSION_PATTERN } from "../lib/client.ts";

/**
 * API Key (`apiKey`, sent as an `Authorization: Bearer` header).
 *
 * Tally's OpenAPI declares exactly one security scheme —
 * `bearerAuth: { type: "http", scheme: "bearer" }` — applied globally, and the
 * introduction states plainly that "Authentication to the Tally API requires an
 * Authorization header with a Bearer token". Mint a key at
 * **Settings -> API keys -> Create API key**; it is shown once and cannot be
 * retrieved again.
 *
 * **Keys carry no scopes.** The vendor's API-keys page is explicit: "each API
 * key is tied to a specific user — meaning that it will inherit the permissions
 * of the user". So there is no scope a credential could legitimately lack, and
 * `test` can safely probe the whoami endpoint. A key also dies with its user's
 * membership: remove the user from the organization and the key stops working.
 *
 * ## Why OAuth2 is not offered here
 *
 * Tally *does* run an OAuth2 authorization-code service — `GET
 * https://tally.so/oauth/authorize` is a real route (it redirects to the login
 * page rather than 404ing, while a nonsense path on the same host does 404),
 * and `POST https://api.tally.so/oauth/token` answers with a well-formed
 * `{"error":"invalid_client"}` (both verified live 2026-08-03). But it is
 * **undocumented**: it appears nowhere in the OpenAPI document, nowhere in the
 * 40-page developer-docs index (`llms.txt`), and nowhere on the API-keys page.
 * The scope vocabulary and the client-registration path are unpublished, and an
 * `oauth2` AuthDefinition cannot be written without inventing both. It is left
 * out until Tally documents it — see this app's README.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Tally -> Settings -> API keys. Sent as an `Authorization: Bearer` header on every request.",
  connectionLabel: "{{user.email}}",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Tally -> Settings -> API keys -> Create API key. Copy it immediately; it is not shown again.",
    },
    {
      key: "apiVersion",
      label: "API version",
      type: "string",
      required: false,
      placeholder: "2025-02-01",
      hint:
        "Optional. Pins the `tally-version` header on every request. Leave blank to use the version your API key was created against, which is what Tally does by default.",
      validation: { pattern: VERSION_PATTERN },
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  /**
   * `GET /users/me` — the account whoami. It is the cheapest read Tally
   * publishes, needs no scope (keys have none), and touches no form data, so it
   * is a genuine liveness probe rather than an incidental one.
   */
  async test({ credential }, ctx) {
    const { apiKey, apiVersion } = credential as { apiKey?: string; apiVersion?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const headers: Record<string, string> = {
      accept: "application/json",
      authorization: `Bearer ${apiKey}`,
    };
    if (apiVersion) headers[VERSION_HEADER] = apiVersion;

    const res = await ctx.fetch(`${BASE_URL}/users/me`, { headers });
    if (!res.ok) {
      // Tally answers 401 with `text/plain` ("Unauthorized"), not JSON, so read
      // the body as text and only then try to make sense of it.
      const text = await res.text().catch(() => "");
      let message = text.slice(0, 200);
      try {
        const body = JSON.parse(text) as { message?: string };
        if (typeof body.message === "string") message = body.message;
      } catch {
        // Not JSON — keep the raw text.
      }
      return { ok: false, message: message || `Tally returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Records the pinned API version (so `lib/client.ts` can send it without ever
   * seeing the credential) plus the account identity for the connection label.
   */
  async afterConnect({ credential }, ctx) {
    const { apiVersion } = credential as { apiVersion?: string };
    const display: Record<string, unknown> = {};
    if (apiVersion) display.apiVersion = apiVersion;

    const res = await ctx.fetch(`${BASE_URL}/users/me`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return display;

    const user = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (user) display.user = user;
    return display;
  },
};

export default apiKey;
