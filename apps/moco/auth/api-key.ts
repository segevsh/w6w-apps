import type { AuthDefinition } from "@w6w/types";
import { baseUrl, errorDetail } from "../lib/client.ts";

/**
 * API key (`apiKey`), MOCO's only authentication scheme.
 *
 * `docs.mocoapp.com/api/docs/v1.yaml` (`securitySchemes`, fetched 2026-09-15) documents two
 * equivalent header shapes for the same key — `Authorization: Token token=YOUR_API_KEY`
 * (`TokenAuth`) and `Authorization: Bearer YOUR_API_KEY` (`BearerAuth`). This app sends the
 * `Token token=` form: it is the one MOCO's own docs lead with everywhere (`authentication.html`
 * and every curl example in the OpenAPI description use it first), and it reads unambiguously as
 * "a MOCO token" rather than a generic bearer that could be mistaken for OAuth.
 *
 * MOCO documents two kinds of key, both accepted at this same header: a **User API key** (Profile
 * → Integrations) scoped to that user's own visibility, and an **Account API key** (Settings →
 * Extensions → API & Webhooks) that can be minted read-only or full-access across the whole
 * account. Either works here; which one a customer picks is a permissions decision for them, not
 * something this app can distinguish from the header alone.
 *
 * **The account subdomain is part of the URL, not a header.** MOCO has no single shared API host —
 * every account is `https://{account}.mocoapp.com/api/v1` — so the subdomain is collected as a
 * connection field (same shape as `apps/freshdesk`'s `domain`) and echoed onto the connection's
 * display data by `afterConnect`, which is where `lib/client.ts` reads it from.
 *
 * **A 401 does not necessarily mean a bad key.** MOCO returns 401 for a wrong/deleted key
 * (`{"message":"Invalid API key."}`) but *also* for a subdomain that does not exist
 * (`{"message":"Subdomain does not exist."}`) — both verified live against `demo.mocoapp.com` and a
 * nonsense subdomain. `test` reads the message body rather than the status code alone, so a typo'd
 * account name is reported as a wrong account, not a wrong key.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    'Find your personal API key under your MOCO profile\'s "Integrations" tab, or create an ' +
    "account-wide key under Settings → Extensions → API & Webhooks.",
  connectionLabel: "{{account}}.mocoapp.com",
  apiKey: { in: "header", name: "Authorization", prefix: "Token token=" },
  fields: [
    {
      key: "account",
      label: "Account subdomain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.mocoapp.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Profile → Integrations (user key), or Settings → Extensions → API & " +
        "Webhooks (account key).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Token token=${apiKey}`;
    return request;
  },

  /**
   * `GET /session` — MOCO's own documented key-verification endpoint. Chosen over any collection
   * endpoint because it needs no scope beyond "the key exists": the response body is only
   * `{ id, uuid }`, MOCO's internal user id and a stable UUID — never the key itself, and never
   * account data that would depend on a permission the credential might legitimately lack.
   */
  async test({ credential }, ctx) {
    const { account, apiKey } = credential as { account?: string; apiKey?: string };
    if (!account) return { ok: false, message: "credential missing account subdomain" };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${baseUrl(account)}/session`, {
      headers: { accept: "application/json", authorization: `Token token=${apiKey}` },
    });
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      const detail = errorDetail(text) ?? "";
      if (/subdomain/i.test(detail)) {
        return {
          ok: false,
          message: `MOCO reports no such account: "${account}.mocoapp.com" (${detail}). Check ` +
            "the account subdomain.",
        };
      }
      return {
        ok: false,
        message: `MOCO rejected the API key (401${detail ? `: ${detail}` : ""}).`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `MOCO returned ${res.status}${errorDetail(text) ? `: ${errorDetail(text)}` : ""}`,
      };
    }
    return { ok: true };
  },

  /** Records the account subdomain on the connection. Never the key. */
  afterConnect({ credential }) {
    const { account } = credential as { account?: string };
    return Promise.resolve(account ? { account } : {});
  },
};

export default apiKey;
