import type { AuthDefinition } from "@w6w/types";
import { API_BASE, baseHeaders, errorCode, errorText } from "../lib/client.ts";

/**
 * Productive.io personal API token: `X-Auth-Token` plus `X-Organization-Id`.
 *
 * The vendor: "Every request requires two headers" (`X-Auth-Token`, generated in Settings >
 * API integrations; `X-Organization-Id`, the numeric organization id). No OAuth surface is
 * documented for third parties, so none is offered.
 *
 * ## Both headers are stamped by `sign`
 *
 * The organization id is not a secret, but it is part of the credential's identity (a token
 * works against the organizations its person belongs to), so it is a connection field that
 * `sign` reads next to the token. Actions never see either.
 *
 * ## The probe is `GET /projects?page[size]=1`
 *
 * An ordinary list: it needs no id, answers a documented `{data: [...]}` and returns project
 * names only. `GET /organizations` is deliberately NOT used: its documented attributes include
 * `scim_bearer_token` and `invitation_token`, i.e. it hands back live secrets.
 *
 * ## The verdict comes from the body, never the status alone
 *
 * Measured 2026-10-06: a missing and a wrong token both answer
 * `401 {"errors":[{"status":"401","code":"invalid_auth_token","title":"Unauthenticated"}]}`.
 * `test` therefore passes only on a 2xx carrying a `data` array, calls the token invalid only
 * on the vendor code `invalid_auth_token` (or title `Unauthenticated`), and reports any other
 * refusal (a 403 `Access Denied` can be a role without project access OR a wrong organization
 * id, and the body does not say which) with the vendor's own words rather than a guess.
 */

export interface ProductiveCredential {
  apiToken: string;
  organizationId: string;
}

export const PROBE_PATH = "/projects";
export const PROBE_QUERY = "?page[size]=1";

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<ProductiveCredential>): Record<string, string> {
  return {
    "x-auth-token": (credential.apiToken ?? "").trim(),
    "x-organization-id": String(credential.organizationId ?? "").trim(),
  };
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API token",
  description:
    "A Productive.io personal API token (Settings > API integrations > Generate new token) and " +
    "the numeric ID of the organization to work in. The token acts as its owner, so a workflow " +
    "can do exactly what that person can.",
  connectionLabel: "Productive.io (org {{organizationId}})",
  apiKey: { in: "header", name: "X-Auth-Token" },
  fields: [
    {
      key: "apiToken",
      label: "API token",
      type: "secret",
      required: true,
      hint: "Productive > Settings > API integrations > Generate new token. Prefer a dedicated " +
        "person for automation: the token carries that person's permissions.",
    },
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      hint: "The numeric organization id sent as X-Organization-Id on every request.",
    },
  ],

  /** The only hook handed the raw credential; network-less, it stamps both headers. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(
        authHeaders(credential as Partial<ProductiveCredential>),
      )
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<ProductiveCredential>;
    if (!(cred?.apiToken ?? "").trim()) {
      return { ok: false, message: "credential missing apiToken" };
    }
    if (!String(cred?.organizationId ?? "").trim()) {
      return { ok: false, message: "credential missing organizationId" };
    }

    // `sign` only auto-applies to action traffic, so the headers are built by hand here.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}${PROBE_QUERY}`, {
      headers: { ...baseHeaders(), ...authHeaders(cred) },
    });
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;

    if (res.ok) {
      if (body && Array.isArray(body.data)) return { ok: true };
      return {
        ok: false,
        message: `Productive answered ${res.status} but not with a JSON:API collection; not the ` +
          `documented ${PROBE_PATH} response.`,
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message:
          "Productive rate-limited the check (429); the token was not judged. Retry shortly.",
      };
    }
    const code = errorCode(body);
    const msg = errorText(body);
    if (code === "invalid_auth_token" || /^unauthenticated/i.test(msg ?? "")) {
      return {
        ok: false,
        message: "Productive does not accept this API token (invalid_auth_token). It answers a " +
          "missing and a wrong token identically; check it was copied exactly and has not " +
          "been revoked under Settings > API integrations.",
      };
    }
    return {
      ok: false,
      message: `Productive refused the check (${res.status}${msg ? ` ${msg}` : ""}${
        code ? `, ${code}` : ""
      }). A 403 can mean a role without project access or a wrong organization id.`,
    };
  },
};

export default apiToken;
