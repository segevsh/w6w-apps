import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OneSimpleApi access token (`apiKey`).
 *
 * The vendor's every documented endpoint takes the credential as a
 * `?token=<token>` query param — never a header. The runtime appends it
 * automatically via the `apiKey` config below (`in: "query"`); `sign` mirrors
 * that same wiring for callers that invoke `sign()` directly (tests, custom
 * hosts). See `../lib/client.ts` for the invalid-token quirk this shape exists
 * to work around: a bad token doesn't fail with JSON, it 302s to `/login`.
 *
 * Mint a token at https://onesimpleapi.com/user/api-tokens — tokens are scoped
 * per-feature there, so a token must have the relevant feature enabled for
 * each action it's used with.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Paste an access token from onesimpleapi.com → Settings → API Tokens. Travels as the `token` query param on every request.",
  apiKey: { in: "query", name: "token" },
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint:
        "onesimpleapi.com → Settings → API Tokens. Enable the features you plan to use on the token.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    const url = new URL(request.url);
    url.searchParams.set("token", token);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return { ok: false, message: "credential missing token" };
    // Exchange Rate with no from/to conversion is the cheapest documented
    // read: a static lookup, no external resource is generated or cached
    // (unlike the screenshot/pdf/qr-code/image endpoints), and it needs no
    // scope beyond the "Exchange Rate" feature toggle on the token.
    const url = new URL(`${API_URL}/exchange_rate`);
    url.searchParams.set("token", token);
    url.searchParams.set("to_currency", "USD");
    url.searchParams.set("output", "json");
    const res = await ctx.fetch(url.toString());
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {
        ok: false,
        message: `OneSimpleApi did not return JSON (HTTP ${res.status}) — invalid token, or the ` +
          `token lacks the "Exchange Rate" feature`,
      };
    }
    if (!res.ok) return { ok: false, message: `OneSimpleApi returned ${res.status}` };
    return { ok: true };
  },
};

export default apiKey;
