/**
 * BambooHR API key, carried as HTTP Basic with the key as the USERNAME and an
 * arbitrary throwaway password.
 *
 * ## The unusual bit, stated precisely
 *
 * BambooHR does not send the key in a bearer or custom header. It uses HTTP
 * Basic, the API key goes in the username position, and the password is ignored
 * entirely. The Getting Started page says it in as many words:
 *
 *   > "At the HTTP level, the API key is sent over HTTP Basic Authentication.
 *   > Use the secret key as the username and **any random string** for the
 *   > password."
 *
 * and demonstrates it with:
 *
 *   > `curl -i -u "{API Key}:x" "https://{companyDomain}.bamboohr.com/api/v1/employees/directory"`
 *
 * So the encoded payload is `${apiKey}:x`. The literal `x` is a convention from
 * the vendor's own sample, not a requirement — any non-empty string works — but
 * pinning it to `x` makes the wire value reproducible and testable, and matching
 * the documented sample is the safest possible choice. `PASSWORD` below is that
 * constant, and `tests/auth/api-key.test.ts` pins the resulting base64 against
 * BambooHR's own curl sample.
 *
 * Note the contrast with `close` in this same pack, which is also Basic-with-
 * key-as-username but fixes the password EMPTY (`base64("key:")`). The two are
 * one character apart on the wire and are not interchangeable; that is exactly
 * why the payload is built in one exported function here rather than inline at
 * each call site.
 *
 * ## Why `type: "basic"` and not `type: "apiKey"`
 *
 * The credential is conceptually an API key, but `ApiKeyConfig` can only express
 * "put this value, with this prefix, in this header/query/body slot". It cannot
 * express "base64 the value with `:x` appended", so declaring `type: "apiKey"`
 * would describe a wire format this app does not use and a host could not
 * reproduce. `type: "basic"` plus an explicit `sign` hook is the accurate
 * description: Basic is genuinely what goes over the wire.
 *
 * The password is deliberately NOT a field. It is not a secret the user has —
 * the protocol discards it — so prompting for it would only invite confusion.
 *
 * ## The second field is the company domain, and it is not optional
 *
 * BambooHR's API host is per-customer (`https://{companyDomain}.bamboohr.com`),
 * so the connection cannot be used at all without knowing which company it
 * belongs to. It is collected here, alongside the key, and republished onto
 * `connection.display.subdomain` by `afterConnect` so actions can build a base
 * URL without ever seeing the credential. See `lib/client.ts`.
 *
 * ## OAuth 2.0 exists
 *
 * BambooHR also supports an authorization-code OAuth 2.0 flow
 * (`https://{companyDomain}.bamboohr.com/authorize.php` /
 * `https://{companyDomain}.bamboohr.com/token.php`, with `offline_access` for a
 * refresh token), documented on the same Getting Started page and intended for
 * "applications requiring multi-customer access via the Developer Portal". We
 * ship the API key because it needs no developer-portal registration, no client
 * secret and no redirect URI. OAuth is the right choice for a listed marketplace
 * integration; add it as a second `AuthDefinition` when that is needed. Note its
 * endpoints are ALSO per-customer, so it does not remove the company-domain
 * field.
 *
 * All of the above verified against documentation.bamboohr.com on 2026-08-03.
 */
import type { AuthDefinition } from "@w6w/types";
import { API_PATH, apiHost, normalizeSubdomain } from "../lib/client.ts";

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
 * The password half of the Basic pair. BambooHR ignores it; `x` is the value its
 * own documentation uses, so it is the value this app sends.
 */
export const PASSWORD = "x";

/**
 * The one place the wire format is built. Exported so the `test` hook and the
 * unit tests exercise the same code path the `sign` hook uses — a second,
 * hand-rolled copy in `test` is exactly how a `:x` turns into a `:`.
 */
export function basicHeader(apiKey: string): string {
  return `Basic ${encodeBase64(`${apiKey}:${PASSWORD}`)}`;
}

interface Credential {
  subdomain?: string;
  apiKey?: string;
}

/**
 * `GET {host}/api/v1/employees/0` — see the `test` hook for why this endpoint.
 * Built here rather than through `BambooClient` because at connect time there is
 * no Connection yet for the client to read a subdomain from.
 */
function whoamiUrl(subdomain: string): string {
  return `https://${apiHost(subdomain)}${API_PATH}/employees/0`;
}

function companyInfoUrl(subdomain: string): string {
  return `https://${apiHost(subdomain)}${API_PATH}/company_information`;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Your BambooHR company domain plus an API key generated from your own user menu. Sent as " +
    "HTTP Basic with the key as the username and a throwaway password, which is what BambooHR " +
    "documents.",
  connectionLabel: "{{companyName}} ({{subdomain}})",
  fields: [
    {
      key: "subdomain",
      label: "Company Domain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "The part before `.bamboohr.com` in your BambooHR URL — `acme` for " +
        "`https://acme.bamboohr.com`. Pasting the full host or URL also works. Required: " +
        "BambooHR's API host is per-company, so there is no shared endpoint to fall back to.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "In BambooHR, click your name in the lower-left corner and choose 'API Keys' " +
        "(the option appears only for users with sufficient permissions). The key is a " +
        "160-bit hex value. It carries YOUR permissions: every request is authenticated and " +
        "permissioned as if you were using the software, so the fields and employees an action " +
        "can see or edit are exactly the ones you can. No password is needed.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it stamps
   * the header onto the outbound request and returns it.
   *
   * The subdomain half of the credential is deliberately NOT used here. Rewriting
   * the request URL from inside `sign` would hide the destination host from the
   * action that built it and from the egress allowlist check; the host is public,
   * non-secret information, so it travels the public route
   * (`connection.display.subdomain`) instead.
   */
  sign({ request, credential }) {
    const { apiKey: key } = credential as Credential;
    request.headers["authorization"] = basicHeader(key ?? "");
    return request;
  },

  /**
   * `GET /employees/0` — BambooHR's whoami, and the narrowest possible probe.
   *
   * `0` is a documented sentinel: "Pass the id `0` to read the authenticated
   * caller's own record". Crucially it degrades rather than failing for
   * integration-style keys — "if the credentials are not bound to an employee
   * (for example an integration-style account), `0` returns only `{"id": "0"}`
   * with no other fields". So a 200 means the key is live regardless of whether
   * it belongs to a person, and no `fields` are requested so no field-level
   * permission is involved at all.
   *
   * Probing a resource endpoint instead (say `/employees/directory`) would report
   * a working credential as broken whenever directory sharing is switched off for
   * that user's access level, which is a normal configuration rather than a fault.
   *
   * 401 and 403 are separated because BambooHR uses them for genuinely different
   * situations, and the fix differs: 401 is "your API key is missing", while 403
   * is also what the API returns after repeated unknown-key attempts trip its
   * lockout — "If an unknown API key is used repeatedly, the API will disable
   * access for a period of time ... it will send back an HTTP 403 Forbidden".
   * Telling someone to re-check a key they have already fixed is a bad half hour.
   */
  async test({ credential }, ctx) {
    const { subdomain, apiKey: key } = credential as Credential;
    if (!subdomain || !key) return { ok: false, message: "credential missing subdomain / apiKey" };

    let url: string;
    try {
      url = whoamiUrl(subdomain);
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }

    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", authorization: basicHeader(key) },
    });

    if (res.status === 401) {
      return { ok: false, message: "BambooHR rejected the API key (401 — key missing or invalid)" };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message:
          "BambooHR returned 403. Either the key's user lacks API access, or API access has been " +
          "temporarily disabled after repeated attempts with an unknown key — in which case it " +
          "clears on its own after a while.",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message:
          `No BambooHR company found at ${normalizeSubdomain(subdomain)}.bamboohr.com — check ` +
          "the company domain.",
      };
    }
    if (!res.ok) {
      const hint = res.headers.get("x-bamboohr-error-message");
      return { ok: false, message: hint ?? `BambooHR returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Labels the Connection with the company, and republishes the subdomain onto
   * the redacted display so actions can compute the base URL.
   *
   * Publishing `subdomain` here is what makes `lib/client.ts` work at all: the
   * credential is invisible to actions, so the host has to reach them by this
   * public route. It is not secret — it is in the URL of every page the customer
   * loads.
   *
   * `GET /company_information` needs the `company:info` scope and its data may be
   * withheld by permissions, so a failure is swallowed: an unlabelled connection
   * is a cosmetic problem, and failing `afterConnect` over one would block a
   * perfectly good credential. The subdomain is published either way.
   */
  async afterConnect({ credential }, ctx) {
    const { subdomain, apiKey: key } = credential as Credential;
    const normalized = normalizeSubdomain(subdomain ?? "");

    let url: string;
    try {
      url = companyInfoUrl(subdomain ?? "");
    } catch {
      // A malformed subdomain cannot get past `test`; degrade rather than throw.
      return { subdomain: normalized, companyName: normalized };
    }

    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", authorization: basicHeader(key ?? "") },
    });
    if (!res.ok) return { subdomain: normalized, companyName: normalized };

    const body = await res.json().catch(() => null) as {
      displayName?: string;
      legalName?: string;
    } | null;

    return {
      subdomain: normalized,
      // Fall back to the subdomain so `connectionLabel` never renders a blank.
      companyName: body?.displayName ?? body?.legalName ?? normalized,
    };
  },
};

export default apiKey;
