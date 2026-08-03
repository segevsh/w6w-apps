import type { AuthDefinition } from "@w6w/types";
import { normalizeSiteUrl, resolveBaseUrl } from "../lib/client.ts";

/**
 * HTTP Basic against the customer's own WordPress site.
 *
 * ## Why Basic and not OAuth 1.0a
 *
 * The vendor's authentication page
 * (`https://docs.gravityforms.com/rest-api-v2-authentication/`, fetched
 * 2026-08-03) documents three ways in: OAuth 1.0a with a Gravity Forms consumer
 * key/secret, HTTP Basic — "supported **only over HTTPS**" — and "any WordPress
 * specific authentication", which its own troubleshooting log excerpts show
 * includes WordPress Application Passwords
 * (`GF_REST_Authentication::perform_application_password_authentication()`, and
 * an example titled "Successful Basic Authentication using WordPress
 * Application Password").
 *
 * Basic is the only one of those this App implements, deliberately:
 *
 *   - OAuth 1.0a's advantage over Basic, per the same page, is that it works on
 *     plain HTTP. Every request from this App goes out over HTTPS, so the
 *     advantage does not apply.
 *   - Implementing it means HMAC-SHA1 signing with OAuth's parameter
 *     normalisation (percent-encode, sort, re-join, build a signature base
 *     string) inside a network-less `sign` hook, against a per-site host whose
 *     proxy may rewrite the very URL being signed. That is a large, brittle
 *     surface for no security gain over Basic-over-TLS.
 *
 * ## Two credential sources, one wire format
 *
 * Both documented credential kinds are HTTP Basic on the wire, so both work
 * through this one method:
 *
 *   - **WordPress Application Password** (recommended) — Users -> Profile ->
 *     Application Passwords. Username is the WordPress username; the password is
 *     the generated application password. Honours that user's Gravity Forms
 *     capabilities.
 *   - **Gravity Forms consumer key/secret** — Forms -> Settings -> REST API.
 *     Username is the consumer key, password the consumer secret.
 *
 * ## Per-site host
 *
 * The site URL is a property of the CONNECTION, not of a call, so it is
 * collected here once and republished as `connection.display.siteUrl` by
 * `afterConnect`. `lib/client.ts` reads it from there — actions only ever see
 * the redacted Connection, never the credential.
 */

/**
 * Inlined base64 encoder — the app sandbox runs with `import: false`, so we
 * cannot pull `jsr:@std/encoding` at runtime. Same output as @std/encoding's
 * `encodeBase64`: standard base64 with `=` padding, no url-safe swaps.
 */
function encodeBase64(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Application Password",
  description:
    "HTTP Basic against your WordPress site. Use a WordPress Application Password (Users -> " +
    "Profile -> Application Passwords), or a Gravity Forms consumer key/secret pair (Forms -> " +
    "Settings -> REST API). Requires HTTPS.",
  connectionLabel: "{{username}} @ {{site.host}}",
  fields: [
    {
      key: "siteUrl",
      label: "WordPress Site URL",
      type: "string",
      required: true,
      placeholder: "https://example.com",
      hint:
        "Base URL of the WordPress install that runs Gravity Forms, without a trailing `/wp-json`. " +
        "Include the subdirectory for a subdirectory install (e.g. `https://example.com/blog`). " +
        "Must be HTTPS — Gravity Forms only accepts Basic auth over TLS.",
    },
    {
      key: "username",
      label: "Username or Consumer Key",
      type: "string",
      required: true,
      hint: "Your WordPress username, or the consumer key from Forms -> Settings -> REST API.",
    },
    {
      key: "password",
      label: "Application Password or Consumer Secret",
      type: "secret",
      required: true,
      hint:
        "The application password generated at Users -> Profile -> Application Passwords, or the " +
        "consumer secret paired with the key above.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it
   * stamps the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const { username, password } = credential as { username: string; password: string };
    request.headers["authorization"] = `Basic ${encodeBase64(`${username}:${password}`)}`;
    return request;
  },

  /**
   * `GET /gf/v2/forms` — the cheapest authenticated read Gravity Forms offers.
   *
   * There is no unauthenticated ping to probe instead: every `gf/v2` route is
   * capability-gated, and this one needs only `gravityforms_edit_forms`, which
   * both credential kinds carry by default. Reaching it proves four things at
   * once that a transport-level check would conflate — the site resolves, the
   * WordPress REST API is on, the Gravity Forms REST API v2 is enabled at
   * Forms -> Settings -> REST API, and the credential is live.
   */
  async test({ credential }, ctx) {
    const { siteUrl, username, password } = credential as {
      siteUrl?: string;
      username?: string;
      password?: string;
    };
    if (!siteUrl || !username || !password) {
      return { ok: false, message: "credential missing siteUrl / username / password" };
    }

    let baseUrl: string;
    try {
      baseUrl = resolveBaseUrl({ siteUrl });
    } catch (e) {
      return { ok: false, message: String(e instanceof Error ? e.message : e) };
    }

    const res = await ctx.fetch(`${baseUrl}/forms`, {
      headers: {
        accept: "application/json",
        authorization: `Basic ${encodeBase64(`${username}:${password}`)}`,
      },
    });
    if (res.status === 404) {
      return {
        ok: false,
        message:
          "Gravity Forms REST API v2 not found at this site — enable it at Forms -> Settings -> REST API",
      };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message: string | undefined;
      try {
        message = (JSON.parse(body) as { message?: string }).message;
      } catch {
        // Non-JSON body; fall back to the status alone.
      }
      return { ok: false, message: message ?? `Gravity Forms returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Records the site URL on the Connection so actions and the `site` health
   * check can build URLs without the credential. Nothing here goes on the wire:
   * the only account-identifying value Gravity Forms would expose is the
   * capability set behind the same credential `test` already exercised, so a
   * second call would buy nothing.
   */
  afterConnect({ credential }) {
    const { siteUrl, username } = credential as { siteUrl?: string; username?: string };
    const normalized = normalizeSiteUrl(siteUrl ?? "");
    let host = "";
    try {
      host = normalized ? new URL(normalized).host : "";
    } catch {
      // Leave blank rather than guess — the label degrades, nothing breaks.
    }
    return { siteUrl: normalized, username, site: { host } };
  },
};

export default basic;
