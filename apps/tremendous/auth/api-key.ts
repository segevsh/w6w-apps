import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Tremendous API key — `Authorization: Bearer <API_KEY>`.
 *
 * Verified against the `authentication` guide, the `BearerApiKey` security
 * scheme shared by every `reference/*` OpenAPI page, and live probes against
 * `api.tremendous.com` on 2026-09-15.
 *
 * ## One credential, two prefixes, one header
 *
 * A sandbox key is prefixed `TEST_`, a production key `PROD_`; both are
 * presented identically as `Authorization: Bearer <key>`. This app only calls
 * the production host (see `lib/client.ts`), so it expects a `PROD_` key, but
 * `sign` does not enforce the prefix — Tremendous's own API is the one that
 * rejects a mismatched key against the wrong host, and it does so with the
 * same "API key you provided was invalid" body `test` already parses below.
 *
 * ## The probe: `GET /organizations`
 *
 * Picked by reading the `authentication` guide's own worked example (its
 * curl snippet authenticates exactly this call) and by what the response
 * contains, not by guessing a whoami:
 *
 *  - **No credential material.** `list-organizations`' schema is `{id, name,
 *    website, currency_code, status}` — an organization's own name and
 *    currency, never a secret. Confirmed against the OpenAPI response schema.
 *  - **No scope a restricted key could lack.** The endpoint returns "only the
 *    organization to which the API key belongs" per its own description —
 *    there is no narrower or broader read to be refused for.
 *  - **A real credential is required to pass.** Live probes on 2026-09-15:
 *    no `Authorization` header at all answers `401` with `"We did not
 *    receive an API key with this request..."`; a syntactically-plausible
 *    garbage bearer answers `401` with `"The API key you provided was
 *    invalid. You provided: garba********-xyz."`. Both bodies share the one
 *    documented error shape (`{"errors": {"message", "payload"}}`), which is
 *    why `test` below reads `message` rather than trusting the status code
 *    alone — a key valid for the WRONG host (sandbox key against production)
 *    answers the exact same 401 shape as a garbage one, and both must report
 *    the same "check the key" guidance rather than being told apart by guess.
 *
 * `GET /api/v2/ping` is mentioned in the `production-api-access` guide as a
 * smoke test and does answer `401` (not `404`) unauthenticated — so it is a
 * real endpoint — but it has no OpenAPI reference page and its success body
 * is undocumented, so it is deliberately not used here: a probe cannot report
 * "the credential works" from a response shape nobody has confirmed.
 */

export interface TremendousCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared with `test` so no second copy can drift. */
export function authHeaders(credential: Partial<TremendousCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/** `GET /organizations` — see module docs for why this is the probe. */
export const PROBE_PATH = "/organizations";

interface OrganizationsBody {
  organizations?: Array<{ id?: string; name?: string }>;
}

interface TremendousErrorBody {
  errors?: { message?: string; payload?: Record<string, unknown> };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste a production API key from Tremendous > Team Settings > Developers > API Keys. " +
    "Production keys are prefixed PROD_.",
  connectionLabel: "Tremendous ({{organizationName}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Team Settings > Developers > API Keys in the Tremendous dashboard.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<TremendousCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint, and why `message` decides, not the status. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TremendousCredential>;
    const apiKeyValue = (cred?.apiKey ?? "").trim();
    if (!apiKeyValue) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: apiKeyValue }) },
    });
    if (res.ok) {
      const body = await res.json().catch(() => null) as OrganizationsBody | null;
      if (body?.organizations?.length) return { ok: true };
      return {
        ok: false,
        message: "Tremendous accepted the key but returned no organization for it",
      };
    }

    const body = await res.json().catch(() => null) as TremendousErrorBody | null;
    const message = body?.errors?.message;

    if (message?.includes("did not receive an API key")) {
      return {
        ok: false,
        message: "Tremendous received no API key. The credential did not reach the request — " +
          "reconnect this connection.",
      };
    }
    if (message?.includes("API key you provided was invalid")) {
      return {
        ok: false,
        message: "Tremendous rejected the key as invalid. Check it was copied exactly, has " +
          "not been revoked, and is a production (PROD_) key rather than a sandbox (TEST_) one.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Tremendous rejected the key (401)${message ? `: ${message}` : ""}. It may ` +
          "be restricted to a different source IP address.",
      };
    }
    return {
      ok: false,
      message: `Tremendous returned HTTP ${res.status} for ${PROBE_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },

  /**
   * Publish the organization's own name as the Connection label, so a list of
   * Connections doesn't just read "Tremendous" for every one of them.
   *
   * `test` has already established the key is live; a failure here must not
   * fail a good Connection, so it is swallowed.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TremendousCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as OrganizationsBody;
      const org = body.organizations?.[0];
      if (!org?.name) return {};
      return { organizationName: org.name };
    } catch {
      return {};
    }
  },
};

export default apiKey;
