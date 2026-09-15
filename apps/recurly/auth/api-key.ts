/**
 * Recurly private API key, carried as HTTP Basic with an EMPTY password.
 *
 * The OpenAPI document's `securitySchemes.api_key` states it directly:
 * *"Enter the API key as the username and set the password to an empty
 * string."* Every request also needs `type: "basic"` — see `lib/client.ts`
 * module doc §1 — because a bare Basic scheme cannot express the required
 * `Accept: application/vnd.recurly.v2021-02-25+json` version header;
 * `RecurlyClient.request` sets that unconditionally, so it needs no field or
 * hook of its own here.
 *
 * `type: "basic"` rather than `type: "apiKey"` for the same reason `chargebee`
 * and `close` in this pack choose it: Basic is genuinely what goes over the
 * wire, and `ApiKeyConfig` cannot express "base64 the value with a colon
 * appended". There is deliberately no password field — the password is fixed
 * empty by the protocol, so prompting for one would only invite a wrong
 * answer.
 *
 * ## Region is a credential field, not a call parameter
 *
 * A Recurly site lives on exactly one of two hosts — `v3.recurly.com`
 * (global) or `v3.eu.recurly.com` (EU data residency) — each issuing its own,
 * non-interchangeable API keys (`lib/client.ts` module doc §2). Collecting the
 * region once here, republishing it via `afterConnect`, keeps that pairing
 * intact and out of every action's parameter list — the same shape
 * `chargebee`'s per-site host takes.
 */
import type { AuthDefinition } from "@w6w/types";
import { ACCEPT_HEADER, type RecurlyRegion } from "../lib/client.ts";

/**
 * Inlined base64 encoder — the app sandbox runs with `import: false`, so a
 * jsr/npm import cannot be pulled in at runtime. Same output as
 * `@std/encoding`'s `encodeBase64`: standard base64 with `=` padding, no
 * url-safe swaps.
 */
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * The one place the wire format is built. Exported so `test`, `afterConnect`
 * and the unit tests exercise the same code path `sign` uses.
 */
export function basicHeader(apiKey: string): string {
  return `Basic ${encodeBase64(`${apiKey}:`)}`;
}

const HOSTS: Record<RecurlyRegion, string> = { us: "v3.recurly.com", eu: "v3.eu.recurly.com" };

interface Credential {
  apiKey?: string;
  region?: RecurlyRegion;
}

interface SitesResponse {
  object?: string;
  data?: Array<{ subdomain?: string; mode?: string }>;
}

interface RecurlyErrorBody {
  type?: string;
  message?: string;
}

function hostFor(region: string | undefined): string {
  return HOSTS[(region as RecurlyRegion) ?? "us"] ?? HOSTS.us;
}

async function fetchSites(
  ctx: { fetch: typeof fetch },
  host: string,
  apiKey: string,
): Promise<{ res: Response; text: string }> {
  const res = await ctx.fetch(`https://${host}/sites`, {
    headers: { accept: ACCEPT_HEADER, authorization: basicHeader(apiKey) },
  });
  return { res, text: await res.text() };
}

function parseJson<T>(text: string): T | undefined {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

const apiKeyAuth: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "A private API key from Recurly → Integrations → API Credentials. Sent as HTTP Basic with " +
    "the key as the username and an empty password.",
  connectionLabel: "{{subdomain}} ({{region}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      placeholder: "abcd1234...",
      hint: "Recurly → Integrations → API Credentials → Private API Keys. No password is " +
        "needed — Recurly fixes it empty.",
    },
    {
      key: "region",
      label: "Data center",
      type: "select",
      default: "us",
      options: [
        { value: "us", label: "Global (v3.recurly.com)" },
        { value: "eu", label: "EU (v3.eu.recurly.com)" },
      ],
      hint: "A Recurly site lives on exactly one of these hosts, and its API keys only work on " +
        "that host — an EU site's key sent to the global host fails the same way a wrong key " +
        "would. Check your site's own API base URL if unsure.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it
   * stamps the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as Credential;
    request.headers["authorization"] = basicHeader(apiKey ?? "");
    return request;
  },

  /**
   * `GET /sites` — "most useful for finding a site's ID for subsequent
   * requests" per its own summary. It is the right liveness probe:
   *
   *  1. **It needs no resource permission.** A key scoped away from billing
   *     data (Recurly supports read-only and scoped keys) can still list its
   *     own site.
   *  2. **It never echoes the credential back.** The `Site` schema's only
   *     key-shaped field is `public_api_key` — a DIFFERENT, publishable key
   *     used to configure Recurly.js, not the private key this app just sent.
   *  3. **Classification is by the response BODY, not the bare status.** A
   *     failure is read from the OpenAPI `Error` schema's `type` field
   *     (`invalid_api_key` is in its documented enum) rather than assumed
   *     from a 401, and a success is confirmed by the list envelope shape
   *     (`object: "list"`, a `data` array) rather than by "the call didn't
   *     throw".
   */
  async test({ credential }, ctx) {
    const { apiKey, region } = credential as Credential;
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const { res, text } = await fetchSites(ctx, hostFor(region), apiKey);

    if (!res.ok) {
      const body = parseJson<RecurlyErrorBody>(text);
      if (body?.type === "invalid_api_key" || body?.type === "unauthorized") {
        return {
          ok: false,
          message: "Recurly rejected the API key — check the key and the data center it belongs to",
        };
      }
      return { ok: false, message: body?.message ?? `Recurly returned HTTP ${res.status}` };
    }

    const body = parseJson<SitesResponse>(text);
    if (body?.object !== "list" || !Array.isArray(body?.data)) {
      return {
        ok: false,
        message: "Unexpected response from Recurly — GET /sites did not return a list",
      };
    }
    if (body.data.length === 0) {
      return { ok: false, message: "This API key is not associated with any Recurly site" };
    }
    return { ok: true };
  },

  /**
   * Records the region (needed by `lib/client.ts` to build every URL) and the
   * site's subdomain (display only — human-readable label, never the
   * credential).
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey, region } = credential as Credential;
    const resolvedRegion: RecurlyRegion = (region as RecurlyRegion) ?? "us";
    if (!apiKey) return { region: resolvedRegion };

    const { res, text } = await fetchSites(ctx, hostFor(region), apiKey);
    if (!res.ok) return { region: resolvedRegion };

    const body = parseJson<SitesResponse>(text);
    return { region: resolvedRegion, subdomain: body?.data?.[0]?.subdomain };
  },
};

export default apiKeyAuth;
