import type { AuthDefinition } from "@w6w/types";
import { API_URL, describeError } from "../lib/client.ts";

/**
 * Seamless.AI API key — sent as the `Token` request header (no `Bearer`).
 *
 * Verified against the vendor's OpenAPI documents (`docs.seamless.ai/openapi.json`,
 * `ApiKeyAuth`: `in: header`, `name: Token`) and live against `api.seamless.ai`
 * on 2026-10-06.
 *
 * ## Why not OAuth
 *
 * Seamless also documents an OAuth 2.0 authorization-code flow, but it has no
 * public app registration: the customer creates the OAuth client themselves in
 * Settings > Public API and the resulting `client_id`/`client_secret` belong to
 * their own org. A per-org key does the same job with one field, so the API key
 * is the single method here.
 */
export interface SeamlessCredential {
  apiKey: string;
}

export const PROBE_URL = `${API_URL}/credits`;

/**
 * The credential-liveness probe: `GET /v2/credits`.
 *
 * Chosen by reading what each cheap endpoint returns, not by name:
 *
 *  - it requires a credential (unsigned: `401 {"msg":"Unauthorized"}`; a wrong
 *    key: `401 {"msg":"Invalid token"}`, both measured live);
 *  - the spec says it "does not consume public API credits", where every search
 *    and research call does;
 *  - it returns only per-category credit balances — never the key itself;
 *  - it is not an entitlement-gated product surface (campaigns, email sending
 *    and so on sit behind feature flags), so any valid key reaches it.
 *
 * The verdict is read from the body, not the status: a 200 must be the documented
 * `{success, data}` shape, so a proxy's HTML 200 cannot pass for a live key.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Seamless.AI Settings > Public API > API Key > Create New Connection. " +
    "The Public API menu only appears if your account has Public API access.",
  apiKey: { in: "header", name: "Token" },
  connectionLabel: "Seamless.AI",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "login.seamless.ai > Settings > Public API > API Key. Keys are shared across the " +
        "organization's rate limit and credit pool.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<SeamlessCredential>;
    request.headers["token"] = (apiKey ?? "").trim();
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<SeamlessCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(PROBE_URL, {
      headers: { accept: "application/json", token: key },
    });
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;
    const { message, code } = describeError(body);

    if (res.status === 401) {
      return { ok: false, message: `Seamless.AI rejected the API key (${message ?? "401"})` };
    }
    // A 429 is a throttled-but-recognised key.
    if (res.status === 429) return { ok: true, message: "Key accepted; currently rate limited" };
    if (res.status === 422) {
      return { ok: false, message: `Seamless.AI refused the key: ${code ?? message ?? "422"}` };
    }
    if (!res.ok) return { ok: false, message: `Seamless.AI returned ${res.status}` };
    if (!body || typeof body !== "object" || body.success !== true || !("data" in body)) {
      return { ok: false, message: "Seamless.AI answered 200 without the documented shape" };
    }
    return { ok: true };
  },
};

export default apiKey;
