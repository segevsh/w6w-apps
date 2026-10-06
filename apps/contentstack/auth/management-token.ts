import type { AuthDefinition } from "@w6w/types";
import { apiBase, asRegion, HOSTS, type Region, REGIONS } from "../lib/client.ts";

/**
 * Contentstack stack API key + management token — `api_key` and
 * `authorization` request headers.
 *
 * Verified 2026-10-06 against the CMA reference's "Authentication" section
 * ("For API Key and Management Token-based authentication: pass the stack's
 * API key against the api_key parameter as header; pass the Management Token
 * value against the authorization parameter as header") and the OpenAPI
 * file's `securitySchemes` (`api_key`, `authorization`, `authtoken`, all
 * `in: header`). A management token is stack-level and needs no user login, so
 * it is the right credential for automation; the user-session `authtoken` is
 * deliberately not offered.
 *
 * ## Region
 *
 * A stack lives in one of seven fixed regions. `region` travels with the
 * credential so `test` probes the right host and is echoed onto the
 * connection's `display` by `afterConnect`. Only those seven hosts are ever
 * contacted.
 *
 * ## Probe: `GET /v3/content_types?limit=1`
 *
 * Measured live 2026-10-06 against all seven hosts: with no credential, or a
 * fake key and token, the API answers `412` with
 * `{"error_message":"We can't find that Stack…","error_code":109,
 * "errors":{"api_key":["is not valid."]}}`; stack-less endpoints such as
 * `GET /v3/stacks` answer `401` with `error_code` 105 (`errors.authtoken`)
 * for a bad token. Both codes are treated as a rejection. The probe lists content types: it is a stack-level
 * read any management token can make, it carries no scope beyond read, and it
 * returns schema metadata only, never the key or token. The verdict is read
 * from the body — success needs the documented `content_types` array, a
 * rejection is the vendor's own `error_code` — never from the status alone.
 */
export interface ContentstackCredential {
  apiKey: string;
  managementToken: string;
  region?: Region | string;
}

/** Vendor error codes that mean "this credential is not accepted". */
const REJECTED = new Set([105, 109]);

const REGION_LABEL: Record<Region, string> = {
  "na": "AWS North America",
  "eu": "AWS Europe",
  "au": "AWS Australia",
  "azure-na": "Azure North America",
  "azure-eu": "Azure Europe",
  "gcp-na": "GCP North America",
  "gcp-eu": "GCP Europe",
};

const managementToken: AuthDefinition = {
  key: "management-token",
  type: "apiKey",
  displayName: "Stack API key + management token",
  description:
    "A stack's API key and a management token from Settings > Tokens > Management Tokens.",
  connectionLabel: "Contentstack ({{region}})",
  apiKey: { in: "header", name: "authorization" },
  fields: [
    {
      key: "apiKey",
      label: "Stack API key",
      type: "secret",
      required: true,
      hint: "Settings > Stack > API Credentials. Starts with blt.",
    },
    {
      key: "managementToken",
      label: "Management token",
      type: "secret",
      required: true,
      hint: "Settings > Tokens > Management Tokens. Needs write access for the write actions.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "na",
      hint: "Where the stack lives. A stack answers only on its own region's host.",
      options: REGIONS.map((r) => ({ value: r, label: `${REGION_LABEL[r]} (${HOSTS[r]})` })),
    },
  ],

  sign({ request, credential }) {
    const { apiKey, managementToken } = credential as unknown as ContentstackCredential;
    request.headers["api_key"] = apiKey;
    request.headers["authorization"] = managementToken;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey, managementToken, region } = credential as unknown as Partial<
      ContentstackCredential
    >;
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!managementToken) return { ok: false, message: "credential missing managementToken" };
    const res = await ctx.fetch(`${apiBase(asRegion(region))}/content_types?limit=1`, {
      method: "GET",
      headers: { api_key: apiKey, authorization: managementToken, accept: "application/json" },
    });
    const body = await res.json().catch(() => undefined) as
      | { error_message?: string; error_code?: number; content_types?: unknown }
      | undefined;
    if (res.ok && Array.isArray(body?.content_types)) return { ok: true };
    if (body?.error_code !== undefined && REJECTED.has(body.error_code)) {
      return {
        ok: false,
        message:
          `Contentstack rejected the credential (${body.error_message ?? body.error_code}). ` +
          "Check the stack API key, the management token and that the region matches the stack's.",
      };
    }
    if (body?.error_code !== undefined) {
      return {
        ok: false,
        message: `Contentstack ${res.status}: ${
          body.error_message ?? "error"
        } (code ${body.error_code})`,
      };
    }
    return { ok: false, message: `Unexpected response from Contentstack (HTTP ${res.status})` };
  },

  /** Echo the region onto the connection so actions can pick a host. */
  afterConnect({ credential }) {
    const { region } = credential as unknown as Partial<ContentstackCredential>;
    return { region: asRegion(region) };
  },
};

export default managementToken;
