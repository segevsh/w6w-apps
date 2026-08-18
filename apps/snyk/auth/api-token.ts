import type { AuthDefinition } from "@w6w/types";
import { API_URL, DEFAULT_VERSION } from "../lib/client.ts";

/**
 * API Token (`apiKey`) — a Snyk API token or service-account token.
 *
 * Verified against the security schemes in the document Snyk serves for its own
 * API: `APIToken` is an `apiKey` in the `Authorization` header whose description
 * states the value "must be prefixed with `Token `". So this is **not** a
 * bearer — it signs as `Authorization: Token <key>`, the same shape PagerDuty
 * uses. (Snyk also declares a `BearerAuth` scheme for its OAuth apps; a
 * personal or service-account token uses the `Token` form.)
 *
 * Two other fields ride on the Connection because Snyk's API needs them and
 * OAuth-style discovery cannot supply them:
 *
 *   - **`orgId`** — most of the surface is organization-scoped and the id is a
 *     UUID, so it is collected once rather than typed into every action.
 *   - **`apiVersion`** — Snyk's API is date-versioned and `version` is a
 *     *required* query parameter on 253 of its 290 operations. The app pins a
 *     default; this field lets a Connection pin a different one deliberately.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description: "Paste a token from Snyk → Account Settings → General → Auth Token, or a service " +
    "account's token. Sent as `Authorization: Token <key>`.",
  connectionLabel: "{{user.username}}",
  apiKey: { in: "header", name: "Authorization", prefix: "Token " },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Snyk → Account Settings → General → Auth Token, or a service account token.",
    },
    {
      key: "orgId",
      label: "Organization ID",
      type: "string",
      default: "",
      placeholder: "4a18d42f-0706-4ad0-b127-24078731fbed",
      hint: "Optional default for org-scoped actions. Snyk → Settings → General → Organization ID.",
    },
    {
      key: "apiVersion",
      label: "API Version",
      type: "string",
      default: DEFAULT_VERSION,
      placeholder: DEFAULT_VERSION,
      hint: "Snyk's API is date-versioned and every request must name one. Change this only " +
        "deliberately — a different date can change response shapes.",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}(~(beta|experimental))?$" },
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Token ${apiToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiToken, apiVersion } = credential as { apiToken?: string; apiVersion?: string };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };
    const version = apiVersion?.trim() || DEFAULT_VERSION;

    // `GET /self` is the whoami: it takes no org id and no extra entitlement,
    // so it proves the token without assuming the connection's `orgId` is
    // correct. The `version` parameter is mandatory — verified live 2026-08-18,
    // an unauthenticated call answers Snyk's JSON:API error envelope
    // `{"jsonapi":{"version":"1.0"},"errors":[{"status":"401",…}]}`.
    const res = await ctx.fetch(`${API_URL}/self?version=${encodeURIComponent(version)}`, {
      headers: {
        authorization: `Token ${apiToken}`,
        accept: "application/vnd.api+json",
      },
    });
    if (res.status === 401) return { ok: false, message: "Snyk rejected the token (401)" };
    if (res.status === 400) {
      // The most likely 400 here is an unrecognised version date.
      return {
        ok: false,
        message: `Snyk rejected the request (400) — check that "${version}" is a valid API version`,
      };
    }
    if (!res.ok) return { ok: false, message: `Snyk returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the org and version actions need, plus who the token belongs to.
   * Best-effort: a failed lookup must not fail the connect flow, and the two
   * configured values are recorded either way.
   */
  async afterConnect({ credential }, ctx) {
    const { apiToken, orgId, apiVersion } = credential as {
      apiToken: string;
      orgId?: string;
      apiVersion?: string;
    };
    const scope = {
      orgId: orgId?.trim() || undefined,
      apiVersion: apiVersion?.trim() || DEFAULT_VERSION,
    };
    const res = await ctx.fetch(
      `${API_URL}/self?version=${encodeURIComponent(scope.apiVersion)}`,
      { headers: { authorization: `Token ${apiToken}`, accept: "application/vnd.api+json" } },
    );
    if (!res.ok) return scope;
    const body = await res.json().catch(() => null) as {
      data?: { id?: string; attributes?: { name?: string; username?: string; email?: string } };
    } | null;
    const attrs = body?.data?.attributes;
    if (!attrs) return scope;
    return {
      ...scope,
      user: {
        id: body?.data?.id,
        name: attrs.name,
        username: attrs.username,
        email: attrs.email,
      },
    };
  },
};

export default apiToken;
