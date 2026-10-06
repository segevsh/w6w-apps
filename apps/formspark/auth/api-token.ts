import type { AuthDefinition } from "@w6w/types";
import { API_BASE, problemCode } from "../lib/client.ts";

/**
 * Formspark API token — `Authorization: Bearer <token>`.
 *
 * Spec: `components.securitySchemes.bearerAuth` (`type: http`, `scheme: bearer`), checked
 * against the OpenAPI document and `documentation.formspark.io/api/` on 2026-10-06. Tokens
 * (they look like `fsk_live_...`) are created at dashboard.formspark.io/account/api-tokens, carry
 * the access of the account that created them (every workspace the account belongs to) and are
 * limited to a set of scopes: `workspaces|forms|submissions` x `read|write`.
 *
 * ## The management API needs an UPGRADED workspace
 *
 * Free workspaces answer `403 upgrade_required` to every form and submission call. Only
 * `GET /me` and `GET /workspaces` stay open on any plan. That decides the probe.
 *
 * ## The probe is `GET /me`
 *
 * Chosen by the response body, not the name. `/me` describes the token: `{name, scopes,
 * expiresAt, lastUsedAt, createdAt}` — the token's label and metadata, never its value. It
 * needs no scope and no upgraded workspace, so the narrowest usable token on the cheapest plan
 * still reaches it. Verdicts come from the problem body's stable `code`, with the status as a
 * hint (measured 2026-10-06, both `401 application/problem+json`):
 *
 *   - no header  -> `invalid_token`, detail "Provide a token in the Authorization header."
 *   - bad token  -> `invalid_token`, detail "The token is not valid."
 *
 * A passing probe says the token is live, NOT that forms are reachable: it will still pass on
 * a free workspace. The scopes it reports are surfaced in the message so a missing scope is
 * visible at connect time.
 */

export interface FormsparkCredential {
  apiToken: string;
}

export const PROBE_PATH = "/me";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description: "Paste an API token from dashboard.formspark.io/account/api-tokens. The workspace " +
    "you want to manage must be upgraded: Formspark's API refuses form and submission calls on " +
    "a free workspace.",
  connectionLabel: "Formspark",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Create it at dashboard.formspark.io/account/api-tokens and grant only the scopes " +
        "(workspaces, forms, submissions: read / write) your workflows need.",
    },
  ],

  /** The only hook handed the raw credential; network-less — stamps the header and returns. */
  sign({ request, credential }) {
    const { apiToken } = credential as Partial<FormsparkCredential>;
    request.headers["authorization"] = `Bearer ${apiToken ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<FormsparkCredential>)?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    // `sign` only auto-applies to action traffic, so the header is built by hand here.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;

    if (res.ok) {
      if (body && typeof body === "object" && Array.isArray(body.scopes)) {
        return { ok: true };
      }
      return { ok: false, message: "Formspark /me answered 200 but not with a token description" };
    }

    const code = problemCode(body);
    const detail = typeof body?.detail === "string" ? body.detail : undefined;
    if (code === "invalid_token") {
      return {
        ok: false,
        message: `Formspark rejected the token (${res.status} invalid_token${
          detail ? `: ${detail}` : ""
        }). Check it was copied exactly and has not been revoked or expired.`,
      };
    }
    if (code) {
      return {
        ok: false,
        message: `Formspark refused the token check (${res.status} ${code}${
          detail ? `: ${detail}` : ""
        })`,
      };
    }
    return { ok: false, message: `Formspark returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default apiToken;
