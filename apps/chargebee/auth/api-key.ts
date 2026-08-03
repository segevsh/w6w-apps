import type { AuthDefinition } from "@w6w/types";
import { API_PATH, apiHost, normalizeSite } from "../lib/client.ts";

/**
 * Chargebee API key, carried as HTTP Basic with an EMPTY password.
 *
 * ## The unusual bit, stated precisely
 *
 * Chargebee does not send the key in a bearer or custom header. It uses HTTP
 * Basic, and the API key goes in the **username** position with **nothing** in
 * the password position. Chargebee's getting-started page says it in as many
 * words:
 *
 *   > "All API requests use HTTP Basic Auth. Use your API key as the username.
 *   > Leave the password empty."
 *
 * and every curl sample in the reference is written the same way — note the
 * bare colon:
 *
 *   > `curl https://{site}.chargebee.com/api/v2/customers -u {site_api_key}:`
 *
 * The OpenAPI document agrees at the schema level: the only security scheme is
 * `BasicAuth: { "type": "http", "scheme": "basic" }`, and a live request to
 * `https://demo.chargebee.com/api/v2/customers` answers `401` with
 * `WWW-Authenticate: Basic` (verified 2026-08-03).
 *
 * The clearest statement of all is in Chargebee's own Node client, where the
 * wire value is code rather than prose
 * (`chargebee-node/src/RequestWrapper.ts`):
 *
 *   > `Authorization: 'Basic ' + Buffer.from(env.apiKey + ':').toString('base64')`
 *
 * So the encoded payload is `${apiKey}:` — the trailing colon is REQUIRED and is
 * the whole subtlety. `base64("key")` without it is a different string and
 * Chargebee rejects it. `tests/auth/api-key.test.ts` pins this both ways.
 *
 * ## Why `type: "basic"` and not `type: "apiKey"`
 *
 * The credential is conceptually an API key, but `ApiKeyConfig` can only express
 * "put this value, with this prefix, in this header/query/body slot". It cannot
 * express "base64 the value with a colon appended", so declaring `type:
 * "apiKey"` with an `apiKey` config would describe a wire format this app does
 * not use and a host could not reproduce. `type: "basic"` plus an explicit
 * `sign` hook is the accurate description: Basic is genuinely what goes over the
 * wire. The `close` and `gravityforms` apps in this pack take the same position.
 *
 * There is deliberately no password field. The password is not a secret the user
 * has — it is fixed at empty by the protocol — so prompting for it would only
 * invite someone to type something wrong.
 *
 * ## The site name is a credential field, not a call parameter
 *
 * Chargebee has no shared API host: the base URL is
 * `https://{site}.chargebee.com/api/v2`, and a key is scoped to exactly one
 * site. Collecting the site here (and republishing it as
 * `connection.display.site` for `lib/client.ts`) keeps that pairing intact and
 * keeps it out of every action's parameter list.
 *
 * A test site is a SEPARATE site with its own name and its own key —
 * `acme-test`, not a flag on `acme` — so there is no sandbox toggle here. You
 * connect the test site by naming it.
 */

/**
 * Inlined base64 encoder — the app sandbox runs with `import: false`, so we
 * cannot pull `jsr:@std/encoding` at runtime. Same output as @std/encoding's
 * `encodeBase64`: standard base64 with `=` padding, no url-safe swaps.
 */
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * The one place the wire format is built. Exported so the `test` hook,
 * `afterConnect` and the unit tests exercise the same code path the `sign` hook
 * uses — a second, hand-rolled copy is exactly how a trailing colon goes
 * missing.
 */
export function basicHeader(apiKey: string): string {
  return `Basic ${encodeBase64(`${apiKey}:`)}`;
}

interface Credential {
  site?: string;
  apiKey?: string;
}

/** `GET {site}/api/v2/configurations` — see the `test` hook for why this endpoint. */
function configurationsUrl(site: string): string {
  return `https://${apiHost(site)}${API_PATH}/configurations`;
}

interface ConfigurationsResponse {
  configurations?: Array<{ domain?: string; product_catalog_version?: string }>;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Your Chargebee site name plus an API key from Settings > Configure Chargebee > API Keys and " +
    "Webhooks. Sent as HTTP Basic with the key as the username and an empty password.",
  connectionLabel: "{{site}} (Product Catalog {{productCatalogVersion}})",
  fields: [
    {
      key: "site",
      label: "Site",
      type: "string",
      required: true,
      placeholder: "acme",
      hint:
        "The subdomain part of your Chargebee URL — `acme` for `https://acme.chargebee.com`. A " +
        "test site is a separate site with its own name and key, so enter `acme-test` to connect " +
        "that one. Pasting the full host or base URL also works.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      placeholder: "live_...",
      hint: "Chargebee > Settings > Configure Chargebee > API Keys and Webhooks > API Keys. A " +
        "Full-Access key is needed for the write actions; a Read-Only key is enough for the list " +
        "and retrieve actions. Keys are per-site and per-environment. No password is needed — " +
        "Chargebee fixes it empty.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it stamps
   * the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const { apiKey: key } = credential as Credential;
    request.headers["authorization"] = basicHeader(key ?? "");
    return request;
  },

  /**
   * `GET /configurations` — "Returns a list of your domain and product catalog
   * version details."
   *
   * It is the right liveness probe for three reasons, in order of importance:
   *
   *  1. **It needs no resource permission.** It reads site metadata, not
   *     business objects, so it works for a Read-Only key as well as a
   *     Full-Access one. Probing `/customers` instead would report a working
   *     credential as broken on a key legitimately restricted away from it.
   *  2. **It takes no parameters and returns a handful of bytes**, so it is the
   *     cheapest call in the surface.
   *  3. **It answers the question this App most needs answered at connect
   *     time** — which product catalog version the site is on. This App
   *     implements Product Catalog 2.0; on a PC 1.0 site the subscription and
   *     catalog actions do not exist at all. Saying so here beats a 404 later.
   *
   * The endpoint was confirmed to exist independently of the docs: with a bogus
   * credential `GET /api/v2/configurations` answers 401 while
   * `GET /api/v2/definitely_not_real_xyz` answers 404 (2026-08-03), so the 401
   * is authentication failing on a real route rather than a catch-all.
   *
   * A PC 1.0 site still connects successfully — the customer, invoice, payment
   * source and event actions work there — but the message says what will not.
   */
  async test({ credential }, ctx) {
    const { site, apiKey: key } = credential as Credential;
    if (!site || !key) return { ok: false, message: "credential missing site / apiKey" };

    let url: string;
    try {
      url = configurationsUrl(site);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }

    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", authorization: basicHeader(key) },
    });

    if (res.status === 401) {
      return { ok: false, message: "Chargebee rejected the API key (401)" };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `no Chargebee site named "${normalizeSite(site)}" — check the site name`,
      };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message: string | undefined;
      try {
        message = (JSON.parse(body) as { message?: string }).message;
      } catch {
        // Non-JSON body; the status alone is the more honest message.
      }
      return { ok: false, message: message ?? `Chargebee returned HTTP ${res.status}` };
    }

    const body = await res.json().catch(() => null) as ConfigurationsResponse | null;
    const version = body?.configurations?.[0]?.product_catalog_version;
    if (version && version !== "v2") {
      return {
        ok: true,
        message:
          `Connected, but this site runs Product Catalog ${version}. This app implements Product ` +
          "Catalog 2.0 — the subscription and catalog actions will not resolve here; the " +
          "customer, invoice, payment source and event actions will.",
      };
    }
    return { ok: true };
  },

  /**
   * Records the site (so actions and `lib/client.ts` can build URLs without the
   * credential) and the catalog version (so the connection label states which
   * surface is actually available).
   *
   * Nothing here can carry credential material: `GET /configurations` returns
   * only the site's own domain and catalog version, and the site name the user
   * typed is not a secret — it is a public subdomain.
   */
  async afterConnect({ credential }, ctx) {
    const { site, apiKey: key } = credential as Credential;
    const normalized = normalizeSite(site ?? "");

    let url: string;
    try {
      url = configurationsUrl(site ?? "");
    } catch {
      // A malformed site cannot get past `test`; degrade rather than throw.
      return { site: normalized };
    }

    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", authorization: basicHeader(key ?? "") },
    });
    if (!res.ok) return { site: normalized };

    const body = await res.json().catch(() => null) as ConfigurationsResponse | null;
    const config = body?.configurations?.[0];
    return {
      site: normalized,
      domain: config?.domain,
      productCatalogVersion: config?.product_catalog_version,
    };
  },
};

export default apiKey;
