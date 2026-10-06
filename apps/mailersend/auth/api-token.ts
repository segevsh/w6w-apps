import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * MailerSend API token — `Authorization: Bearer <token>`.
 *
 * Verified against developers.mailersend.com ("General API resources" -> Authentication)
 * and live probes of `api.mailersend.com` on 2026-10-06.
 *
 * ## Tokens are scoped, and the scope is per area
 *
 * A MailerSend token is minted for ONE sending domain and carries a list of scopes
 * (`email_full`, `domains_read`, `activity_read`, `templates_full`, `webhooks_full`,
 * `suppressions_read`, …). A token that can send mail may be refused every other
 * endpoint. So an Action failing with `403 … #MS40301` means "this token lacks that
 * scope", not "the connection is broken" — and the probe below treats that same 403 as
 * a LIVE credential.
 *
 * ## The probe: `GET /v1/domains?limit=10`
 *
 *  - It needs a credential. Unauthenticated, and with a fake token, it answers
 *    `401 {"message":"Unauthenticated."}` (measured). It is not one of the endpoints
 *    that answers 200 to anyone.
 *  - It echoes no credential. The response is domain names and DNS flags.
 *  - **There is no whoami.** MailerSend has no `/me`; `/token` lists tokens and is a
 *    different scope (`tokens_full`). `domains_read` is the most commonly granted read.
 *  - The documented answer for a valid token that lacks the scope is `403` with
 *    error code `MS40301`; that is classified from the BODY, not from the status.
 *
 * A missing token and a wrong token answer byte-identically, so there is nothing finer
 * to say than "rejected".
 */
export interface MailerSendCredential {
  apiToken: string;
}

export const PROBE_PATH = "/domains";

const authApiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    "Create an API token in MailerSend under Integrations > API tokens. Tokens are scoped to a sending domain and to named permissions; give the connection only the scopes the workflows need.",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint:
        "MailerSend > Integrations > API tokens > Generate new token. Pick the domain and the permissions (e.g. Email: full access, Domains: read, Activity: read).",
    },
  ],

  /** The only hook handed the raw credential, and it runs network-less. */
  sign({ request, credential }) {
    const { apiToken } = credential as Partial<MailerSendCredential>;
    request.headers["authorization"] = `Bearer ${apiToken ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<MailerSendCredential>)?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}${PROBE_PATH}?limit=10`, {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the MailerSend API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: { message?: string; data?: unknown } | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached the API */ }

    if (res.ok) {
      // A 200 that is not the documented `{ data: [...] }` is not this API.
      return Array.isArray(body?.data) ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET ${PROBE_PATH} — not { data: [...] }`,
      };
    }

    const message = body?.message ?? "";

    // 403 + MS40301: the token authenticated but lacks the domains scope. Live.
    if (res.status === 403 && message.includes("MS40301")) {
      return { ok: true, message: "token is valid but has no domains scope (MS40301)" };
    }
    // 429 is only ever issued to an authenticated caller.
    if (res.status === 429) {
      return { ok: true, message: `token is valid but the account is rate limited: ${message}` };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `MailerSend rejected the token (401 ${message || "Unauthenticated."}). ` +
          "Check it was copied exactly and has not been deleted under Integrations > API tokens.",
      };
    }
    if (res.status >= 500) {
      return {
        ok: false,
        message: `MailerSend is erroring (${res.status}); the token was not judged`,
      };
    }
    // 403 with MS40302..MS40305 etc.: account switched off / suspended / IP not allowlisted.
    return { ok: false, message: `MailerSend ${res.status}: ${message || raw.slice(0, 160)}` };
  },
};

export default authApiToken;
