import type { AuthDefinition } from "@w6w/types";
import { FathomClient } from "../lib/client.ts";

/**
 * API Key (`apiKey`, header-located).
 *
 * Fathom's documented scheme is a single header. Its OpenAPI document declares
 * exactly one API-key security scheme —
 * `ApiKeyAuth: { type: apiKey, in: header, name: X-Api-Key }` — and the
 * quickstart's only example is:
 *
 *   `curl https://api.fathom.ai/external/v1/meetings -H "X-Api-Key: YOUR_API_KEY"`
 *
 * There is no query-param form and no per-account host. Mint a key in Fathom
 * under **Settings -> API Access**.
 *
 * ## Why OAuth2 is not offered here
 *
 * Fathom does support OAuth2 — the spec also declares a `BearerAuth` scheme and
 * the SDK docs publish the token endpoint
 * (`POST https://api.fathom.ai/external/v1/oauth2/token`, scope `public_api`).
 * It is deliberately NOT implemented, for two reasons that are facts about the
 * vendor's docs rather than preferences:
 *
 *   1. **The authorization URL is not published.** Fathom's own SDKs generate it
 *      inside `Fathom.getAuthorizationUrl(...)`; neither the OpenAPI document
 *      nor any docs page states the endpoint. An `oauth2` AuthDefinition
 *      requires `authorizationUrl`, and guessing one would be inventing an API.
 *   2. **It is gated on partner review.** OAuth credentials come from
 *      registering a marketplace application, which Fathom reviews — so the flow
 *      cannot be exercised from a manifest alone.
 *
 * A bearer-token method taking a pre-obtained access token was considered and
 * rejected: Fathom's docs state those tokens are short-lived and each refresh
 * token is single-use, so a stored one would go stale within the hour.
 *
 * ## No `afterConnect`
 *
 * Fathom publishes no whoami endpoint — there is no `/me`, and `GET /users` is
 * account-admin-only (403 otherwise), so it cannot stand in for one. Rather than
 * label a Connection from the recorder of whatever meeting happens to be most
 * recent, nothing is recorded and no `connectionLabel` is declared.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Fathom -> Settings -> API Access. Sent as the `X-Api-Key` header on every request.",
  apiKey: { in: "header", name: "X-Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Fathom -> Settings -> API Access -> generate an API key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-api-key"] = apiKey;
    return request;
  },

  /**
   * `GET /meetings` — the cheapest call every key can make.
   *
   * Fathom keys carry no per-resource scopes, but they DO carry account role:
   * `/users` is `account_admin`-only and answers 403 for an ordinary member, so
   * probing it would report a perfectly good credential as broken. `/meetings`
   * is the call Fathom's own quickstart uses to demonstrate a working key, and
   * the call its OAuth walkthrough uses to "test the connection". No
   * `include_*` flag is set, so this stays on the global rate limit rather than
   * the heavier summary/transcript one.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(FathomClient.url("/meetings"), {
      headers: { accept: "application/json", "x-api-key": apiKey },
    });
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    return {
      ok: false,
      message: text
        ? `Fathom returned HTTP ${res.status}: ${text.slice(0, 200)}`
        : `Fathom returned HTTP ${res.status}`,
    };
  },
};

export default apiKey;
