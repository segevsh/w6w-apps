import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { ACCOUNT_HOST, asRegion, errorText, HOSTS, REGION_LABEL, REGIONS } from "../lib/client.ts";
import type { Region } from "../lib/client.ts";

/**
 * Browserless API token — merged into each request's query string as `token`.
 *
 * Verified 2026-10-06 against `docs.browserless.io/overview/api-keys` ("Add your
 * API token to the URL query string as `?token=YOUR_TOKEN`") and live probes of
 * the regional hosts and `api.browserless.io`.
 *
 * ## Query string, because it is the one form documented for every route
 *
 * The docs also say "some endpoints also accept it in the `Authorization`
 * header". A live probe showed `Authorization: Bearer` is recognised on
 * `/content`, `/crawl` and `/map` (a bad one gets the application's own
 * "Invalid API key" refusal, not the edge's), but the vendor does not say it is
 * honoured on every route, so this app uses the form that is. `sign` is the only
 * code that ever sees the token, and no Action puts it in a URL itself.
 *
 * ## Three different "no"s
 *
 * - no token at all on a regional host: the edge answers an HTML
 *   `401 Authorization Required` (openresty);
 * - a token the application does not know: PLAIN TEXT
 *   `Invalid API key. Please check your API key and try again. (requestId: …)`;
 * - `api.browserless.io`: JSON `{"error":"API token is required"}` or
 *   `{"error":"Invalid API token"}`.
 *
 * ## Probe: `GET https://api.browserless.io/v1/account/usage`
 *
 * It is the vendor's documented account read, it needs a valid token, it starts
 * no browser (so it spends no units), and it is not region-scoped. The body is
 * never read or returned by the probe: the vendor documents the call but not its
 * response schema, and the verdict is `res.ok`, with a rejection recognised from
 * the vendor's own error text rather than from the status alone.
 */

export interface BrowserlessCredential {
  token: string;
  region?: Region | string;
}

export const USAGE_PATH = "/v1/account/usage";

export function probeRequest(): SignableRequest {
  return {
    url: `https://${ACCOUNT_HOST}${USAGE_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const REJECTED = /invalid api (key|token)|api token is required|unauthori[sz]ed/i;

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "An API token from the Browserless account dashboard (browserless.io/account), plus the " +
    "region your account is served from. Browserless authenticates with a `token` query " +
    "parameter, which this connection adds to every request.",
  connectionLabel: "Browserless ({{region}})",
  apiKey: { in: "query", name: "token" },
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "browserless.io/account > API Key. Accounts can hold up to 20 tokens, so create one " +
        "for this connection and revoke it independently.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "sfo",
      hint: "Which regional endpoint to call. Pick the one closest to you or the sites you load.",
      options: REGIONS.map((r) => ({ value: r, label: `${REGION_LABEL[r]} (${HOSTS[r]})` })),
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as Partial<BrowserlessCredential>;
    const url = new URL(request.url);
    url.searchParams.set("token", (token ?? "").trim());
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { token } = credential as Partial<BrowserlessCredential>;
    if (!(token ?? "").trim()) return { ok: false, message: "credential missing the API token" };

    const request = await apiToken.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    if (res.ok) return { ok: true };

    const text = errorText(await res.text().catch(() => ""));
    if (REJECTED.test(text) || res.status === 401) {
      return {
        ok: false,
        message: `Browserless rejected the API token (${res.status}${text ? ` ${text}` : ""}). ` +
          "Check it was copied exactly from browserless.io/account and has not been revoked.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Browserless rate-limited the token check (429); try again" };
    }
    return {
      ok: false,
      message: `Browserless answered HTTP ${res.status}${
        text ? `: ${text}` : ""
      } for ${USAGE_PATH}`,
    };
  },

  afterConnect({ credential }) {
    const { region } = credential as Partial<BrowserlessCredential>;
    return { region: asRegion(region) };
  },
};

export default apiToken;
