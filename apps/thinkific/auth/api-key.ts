import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatThinkificError } from "../lib/client.ts";

/**
 * Thinkific API Key — two headers, `X-Auth-API-Key` + `X-Auth-Subdomain`.
 *
 * Verified against the `ApiKey` / `ApiKeySubdomain` security schemes in
 * Thinkific's OpenAPI document and the "Authorization using API Key" support
 * article (`support.thinkific.dev/hc/en-us/articles/4422657425431`), plus live
 * probes against `api.thinkific.com` — all on 2026-08-15.
 *
 * ## `custom`, not `apiKey`
 *
 * `AuthDefinition.apiKey` (`ApiKeyConfig`) can only place ONE value in ONE
 * header/query/body slot. This credential is two values in two headers at
 * once, so `type: "custom"` plus an explicit `sign` hook is the honest shape
 * — the same choice `apps/bigcommerce` makes for its two-field credential.
 *
 * ## The subdomain is a header VALUE, never a hostname
 *
 * This is the detail most likely to be gotten wrong by pattern-matching on
 * every other "subdomain" SaaS in this pack (BambooHR, Zendesk, Shopify: all
 * build `https://{subdomain}.vendor.com`). Thinkific does not: the OpenAPI
 * document declares exactly one server, `https://api.thinkific.com/api/public/v1`,
 * and the vendor's own test command sends the subdomain as a header alongside
 * the fixed host:
 *
 *     curl https://api.thinkific.com/api/public/v1/courses \
 *       -H 'X-Auth-API-Key: my-api-key' \
 *       -H 'X-Auth-Subdomain: my-subdomain'
 *
 * So `lib/client.ts#API_BASE` is a constant and no action ever derives a host
 * from a param or from the credential. The subdomain identifies *which* Site
 * the fixed host should act on, exactly the way a tenant id in a request body
 * would — it just happens to travel as a header instead.
 *
 * ## OAuth exists; this app ships only the API key
 *
 * Thinkific also supports an OAuth 2.0 authorization-code flow (bearer
 * token, `OAuthAccessToken` in the security schemes) for apps distributed
 * through the Partner Portal that need multi-Site or GraphQL access. The API
 * key is what a single-Site integration is supposed to use — the support
 * article frames it as exactly this case ("a simple way to gain access to the
 * API for an individual Thinkific Site... for the purpose of building a
 * private or one-off app") — and it needs no app registration, no client
 * secret and no redirect URI, so it is what this app ships. Add an
 * `AuthDefinition` for OAuth alongside this one if multi-Site access is ever
 * needed; the two are not mutually exclusive.
 *
 * ## Why OAuth scopes never enter this file
 *
 * "REST Permissions and Scopes" states explicitly: "This does not apply to
 * apps using the API Key Authorization." An OAuth-scoped app can get a 403
 * ("App does not have permission to perform this action...") for an endpoint
 * outside its granted scopes; an API-key connection cannot — which is also
 * why `GET /courses`, below, is a safe probe regardless of which resources
 * this app's own Actions end up touching. A 403 seen through this auth method
 * is the *other* documented 403 (`ErrorForbiddenAppsNotAvailableResponse`,
 * "Access to Apps is not available on your plan"), not a scope gap.
 */

export interface ThinkificCredential {
  apiKey: string;
  subdomain: string;
}

/** Strip a pasted URL/host down to the bare subdomain segment. */
export function normalizeSubdomain(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  const withoutScheme = trimmed.replace(/^https?:\/\//i, "");
  return withoutScheme.split(".")[0].replace(/\/.*$/, "");
}

/**
 * The one place the wire format is built. Exported so `test` exercises the
 * same code path `sign` does.
 */
export function authHeaders(credential: Partial<ThinkificCredential>): Record<string, string> {
  return {
    "x-auth-api-key": credential.apiKey ?? "",
    "x-auth-subdomain": normalizeSubdomain(credential.subdomain),
  };
}

/**
 * The credential-liveness probe.
 *
 * `GET /courses?limit=1` is not a guess — it is the **exact** request the
 * vendor's own "Authorization using API Key" article tells a developer to run
 * to "test your connection": `curl .../api/public/v1/courses -H
 * 'X-Auth-API-Key: ...' -H 'X-Auth-Subdomain: ...'`. It also satisfies the
 * usual three criteria independently:
 *
 * **(a) It requires a credential.** Unauthenticated it answers
 * `401 {"error":"Authentication Error"}` (32 bytes, measured 2026-08-15).
 *
 * **(b) It needs no OAuth scope** (moot for API-key auth anyway — see the
 * module doc — but true even so: `GET /courses` sits behind the "Courses"
 * scope, one of the narrowest read-only scopes in the vendor's own table).
 *
 * **(c) It returns nothing secret.** A `CourseResponse` is catalogue data —
 * names, slugs, descriptions — never a credential or personal data.
 */
export const PROBE_PATH = "/courses";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key",
  description:
    "Paste the API Key and Subdomain from your Thinkific Site's Settings > Code & Analytics > " +
    "API section. Requires the Grow/Pro + Growth plan or above.",
  connectionLabel: "{{subdomain}}.thinkific.com",
  fields: [
    {
      key: "subdomain",
      label: "Subdomain",
      type: "string",
      required: true,
      placeholder: "my-site",
      hint: "The part before `.thinkific.com` in your Site's URL. Sent as the X-Auth-Subdomain " +
        "header on every request — Thinkific's API host itself never changes. Pasting the full " +
        "URL also works.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Site Settings > Code & Analytics > API. Resetting the key immediately invalidates " +
        "the previous one, so reconnect this connection right after resetting.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps both headers and returns. Neither value ever appears in a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<ThinkificCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH}. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ThinkificCredential>;
    const key = (cred?.apiKey ?? "").trim();
    const subdomain = normalizeSubdomain(cred?.subdomain);
    if (!key) return { ok: false, message: "credential missing apiKey" };
    if (!subdomain) return { ok: false, message: "credential missing subdomain" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key, subdomain }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");

    if (res.status === 401) {
      return {
        ok: false,
        message:
          "Thinkific rejected the request (401 Authentication Error). This means either the API " +
          "Key/Subdomain pair is wrong or was reset, OR this Site's Thinkific plan does not " +
          "include API access (Grow/Pro + Growth plan or above is required) — Thinkific returns " +
          "the identical error body for both.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message:
          "Thinkific returned 403 (Access to Apps is not available on this Site's plan). This is " +
          "not a bad credential — the key and subdomain are being accepted, but the Site's plan " +
          "does not include the Apps/API feature.",
      };
    }
    return { ok: false, message: formatThinkificError(res.status, "GET", PROBE_PATH, raw) };
  },

  /**
   * Republish the normalized subdomain into the redacted display, so
   * `connectionLabel` never renders whatever raw string the user pasted (a
   * full URL, trailing slash, etc).
   *
   * Thinkific's Admin API publishes no whoami / site-info endpoint (verified:
   * no `/site`, `/account` or equivalent path exists in the OpenAPI document),
   * so there is nothing further worth fetching here.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<ThinkificCredential>;
    return { subdomain: normalizeSubdomain(cred?.subdomain) };
  },
};

export default apiKey;
