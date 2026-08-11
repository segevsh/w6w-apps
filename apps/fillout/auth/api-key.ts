import type { AuthDefinition } from "@w6w/types";
import {
  API_PREFIX,
  apiHost,
  classifyCredentialMessage,
  credentialAdvice,
  type FilloutRegion,
} from "../lib/client.ts";

/**
 * Fillout API key — `Authorization: Bearer <api key>`.
 *
 * Verified against the `bearerAuth` security scheme in every one of Fillout's
 * eight OpenAPI fragments ("Enter your Fillout API key. Format: Bearer
 * <api_key>") and against live probes on 2026-08-11.
 *
 * ## The region is collected here, not per action
 *
 * Fillout runs two separate deployments — `api.fillout.com` (US) and
 * `eu-api.fillout.com` (EU) — and an account exists on exactly one of them.
 * Which one is not derivable from the key, and an Action may never read the
 * credential, so the region is a Connection field that `afterConnect` copies
 * onto the Connection's display data. `lib/client.ts#regionFromConnection`
 * reads it from there.
 *
 * ## What is deliberately not here
 *
 * Fillout also publishes an OAuth surface for "3rd party apps"
 * (`build.fillout.com/authorize/oauth` →
 * `server.fillout.com/public/oauth/accessToken`). It is not implemented, and
 * the README says why in full: the documented exchange omits `response_type`,
 * `grant_type` and `scope`, its success body is
 * `{access_token, base_url}` rather than an RFC 6749 token response, the
 * `base_url` it returns may be an arbitrary self-hosted origin that no egress
 * allowlist can enumerate, and creating a shareable app "may require review and
 * approval from the Fillout team" — so none of it can be exercised, let alone
 * verified, from here.
 */

export interface FilloutCredential {
  apiKey: string;
  region?: FilloutRegion;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the same
 * code path `sign` does — a hand-rolled second copy is how a probe ends up
 * sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<FilloutCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/** Normalise the region field; anything but an explicit `eu` is US. */
export function normalizeRegion(region: unknown): FilloutRegion {
  return region === "eu" ? "eu" : "us";
}

/**
 * The credential-liveness probe: `GET /v1/api/forms`.
 *
 * It is chosen by elimination, and the elimination is short — **Fillout's API
 * has exactly eight endpoints and not one of them is a whoami, a ping, or an
 * account read.** The full documented surface is: get forms, get form metadata,
 * get all submissions, get submission by id, delete submission by id, create a
 * webhook, remove a webhook, create submissions. Six of those eight need a
 * `formId` you do not have before you have called the seventh, and the eighth
 * (`delete`) is destructive. That leaves `GET /forms`.
 *
 * It also satisfies the three things a probe has to satisfy:
 *
 * **(a) It requires a credential.** Unauthenticated it answers
 * `400 {"message":"API authorization header missing"}`; with a syntactically
 * plausible but fake key, `400 {"message":"API Key invalid"}`. Both measured
 * live on 2026-08-11. There is no unauthenticated read anywhere in this API.
 *
 * **(b) It cannot be refused for scope.** Fillout's API keys are not scoped —
 * one key per account, revoked or regenerated as a unit — so there is no
 * "correctly configured key that legitimately cannot reach this endpoint" case
 * to misreport as broken.
 *
 * **(c) It returns no credential material.** The response schema is an array of
 * `{name, formId}` and nothing else. `formId` is the *public* id already
 * present in every share link, so it is not a secret. Compare the traps this
 * pack has already hit — Mailjet's `/apikey` and Follow Up Boss's `/me` return
 * the caller's own live key — and note that Fillout simply has no endpoint that
 * could: it exposes no account object at all.
 *
 * The one cost is that `/forms` takes no `limit`, so it returns every form in
 * the account. That is why `minIntervalSeconds` on the checks that reuse it is
 * 60 — and at 5 requests/second per key, it is also why nothing here probes
 * more often.
 */
export const PROBE_PATH = "/forms";

const apiKeyAuth: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Settings → Developer → API key. One key per account; regenerating it in the dashboard " +
    "immediately invalidates the old one.",
  connectionLabel: "Fillout ({{region}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings → Developer. Fillout keys contain an underscore — copy the whole string, " +
        "prefix included, or the API answers `API key missing underscore`.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "us",
      hint: "Which Fillout deployment this account lives on. The dashboard shows your API base " +
        "URL; `api.fillout.com` is US and `eu-api.fillout.com` is EU. Self-hosted installs are " +
        "not supported by this app.",
      options: [
        { value: "us", label: "United States (api.fillout.com)" },
        { value: "eu", label: "Europe (eu-api.fillout.com)" },
      ],
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The key never appears in a URL —
   * Fillout documents no query-parameter form, and a workflow host logs request
   * URLs but not request headers.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<FilloutCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * See {@link PROBE_PATH} for why `GET /forms`.
   *
   * The verdict comes from the response **body**, never the status code: every
   * credential failure on this API is a `400`, and so are several things that
   * have nothing to do with the credential. `classifyCredentialMessage`
   * carries the measured taxonomy.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<FilloutCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const host = apiHost(normalizeRegion(cred?.region));
    const res = await ctx.fetch(`https://${host}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { message?: unknown } | null;
    const verdict = classifyCredentialMessage(body?.message);

    if (verdict !== "other") {
      return { ok: false, message: `${credentialAdvice(verdict)} (HTTP ${res.status})` };
    }
    if (res.status === 429) {
      // The account is over 5 requests/second. That says nothing about the key,
      // but it did not prove it either — so it is a failure with an honest
      // reason rather than a false pass.
      return {
        ok: false,
        message: "Fillout rate-limited the check (429). Its limit is 5 requests/second per API " +
          "key — retry in a moment.",
      };
    }
    const message = typeof body?.message === "string" ? `: ${body.message}` : "";
    return {
      ok: false,
      message: `Fillout returned HTTP ${res.status} for ${PROBE_PATH}${message}`,
    };
  },

  /**
   * Records the region on the Connection so every Action can pick a host
   * without ever seeing the credential.
   *
   * Nothing else is published. Fillout exposes no account object, so there is
   * no display name to fetch and no second request to make — and a Connection
   * label of "Fillout (eu)" is the only distinguishing fact available anyway.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<FilloutCredential>;
    return { region: normalizeRegion(cred?.region) };
  },
};

export default apiKeyAuth;
