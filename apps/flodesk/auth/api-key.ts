import type { AuthDefinition } from "@w6w/types";
import { FlodeskClient, USER_AGENT } from "../lib/client.ts";

/**
 * API Key over HTTP Basic (`basic`) — Flodesk's "private integration" path.
 *
 * ## Why `type: "basic"` and not `type: "apiKey"`
 *
 * Flodesk's OpenAPI document declares this scheme as
 * `{ "type": "http", "scheme": "basic" }`, and its description states the
 * layout in as many words:
 *
 *   > "Enter the API key as the username and set the password to an empty
 *   >  string."
 *   >
 *   > `curl "api_endpoint_here" \`
 *   > `-H "User-Agent: Your App Name (www.yourapp.com)" \`
 *   > `-H "Authorization: Basic $(echo YOUR_API_KEY: | base64)"`
 *
 * Note the **trailing colon** inside the base64 — the credential on the wire is
 * `base64("<API_KEY>:")`, i.e. the key as username with an EMPTY password. That
 * transformation cannot be expressed by `ApiKeyConfig` (which can only prefix a
 * verbatim value), so the honest declaration is `basic` with the encoding done
 * in `sign`. The same reasoning is why `customerio` in this pack is `basic`.
 *
 * Only one field is collected. The password half is not a field the user can
 * fill in — it is fixed at empty by the vendor's scheme, so offering a box for
 * it would invite a wrong answer.
 *
 * Mint a key at <https://app.flodesk.com/account/integration/api> (the URL
 * Flodesk's own security description links to), documented further at
 * <https://help.flodesk.com/en/articles/4477889>.
 *
 * ## The `test` probe
 *
 * `GET /v1/segments/colors`. Flodesk API keys carry **no scopes** — the OAuth
 * variant has exactly one scope, `all`, and the API-key variant has none at all
 * — so there is no risk of a probe needing a permission a valid key might lack.
 * That leaves "cheapest read" as the only criterion, and `/segments/colors`
 * returns a fixed list of hex strings: no pagination, no account data, no
 * per-account cost. It is also the ONLY endpoint in the whole document whose
 * declared responses are `200` and `401` (every other read pairs 200 with 400 or
 * 404), which is a fair signal that Flodesk treats it as the auth-shaped call.
 *
 * ## No `afterConnect`
 *
 * Flodesk publishes a whoami — but only on the OAuth side
 * (`GET /oauth2/userinfo`, which authenticates with a Bearer access token). No
 * account, profile or whoami endpoint exists under `/v1`, so an API-key
 * connection has nothing to label itself with. Rather than derive a label from
 * unrelated data, none is declared. The OAuth method below does have one.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Paste a Flodesk API key. Sent as HTTP Basic with the key as the username and an empty password, exactly as Flodesk documents.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Flodesk → Account → Integrations → API (app.flodesk.com/account/integration/api). The password half of the Basic pair is fixed at empty and is not collected.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less. It
   * builds `Authorization: Basic base64("<key>:")` — the trailing colon is the
   * empty password and is load-bearing; omitting it produces a header Flodesk
   * rejects with 401.
   */
  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["authorization"] = `Basic ${btoa(`${key}:`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(FlodeskClient.url("/segments/colors"), {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
        authorization: `Basic ${btoa(`${key}:`)}`,
      },
    });
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    return {
      ok: false,
      message: text
        ? `Flodesk returned HTTP ${res.status}: ${text.slice(0, 200)}`
        : `Flodesk returned HTTP ${res.status}`,
    };
  },
};

export default apiKey;
