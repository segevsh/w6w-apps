import type { AuthDefinition } from "@w6w/types";
import { API_URL, formatError, type TwoChatBody } from "../lib/client.ts";

/** `GET /info`'s documented success body (billing guide) — account identity, limits, usage. */
interface InfoBody extends TwoChatBody {
  account?: { name?: string; uuid?: string; on_trial?: boolean; blocked?: boolean };
}

/**
 * 2Chat's per-account API key — read from the authentication guide 2026-10-06.
 *
 * Created at app.2chat.io → Developers → API Access and sent as `X-User-API-Key: <key>`. One key
 * is one account; there is no OAuth flow and no scopes. The guide's own cURL example is the
 * source of the header name; it is a bare key, so there is no `Bearer ` prefix.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A 2Chat API key (app.2chat.io → Developers → API Access), sent as `X-User-API-Key`. One key = one account.",
  connectionLabel: "{{accountName}}",
  apiKey: { in: "header", name: "X-User-API-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Generate or rotate it at https://app.2chat.io/developers?tab=api-access. Every call spends one API credit.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-user-api-key"] = apiKey;
    return request;
  },

  /**
   * `GET /info` — the endpoint 2Chat's own authentication guide names for "test your API key".
   *
   * Chosen over the alternatives because it needs no prior knowledge of the account (no channel,
   * contact or template uuid) and returns the account's own identity and usage — never the key.
   * (Contrast Mailjet's `/apikey` and Follow Up Boss's `/me`, which hand the caller's own secret
   * back; this pack refuses those as probes.)
   *
   * Classified from the BODY, not the status code. A good key is `success: true` with an
   * `account` object. A refusal comes in two shapes — the gateway's `{"detail": "..."}` (a
   * missing key is 403 `Not authenticated`, a wrong one 401 `Invalid API Key`; measured
   * 2026-10-06) and the API's own `{error, error_message}` — and `formatError` reads both. A 2xx
   * with neither shape is not proof of a live key and is refused.
   *
   * One credit is spent per call (billing guide: "every time the API is used, 1 credit is
   * deducted").
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}/info`, {
      headers: { accept: "application/json", "x-user-api-key": apiKey },
    });
    const body = await res.json().catch(() => undefined) as InfoBody | undefined;

    if (res.ok && body?.success === true && body.account && typeof body.account === "object") {
      if (body.account.blocked === true) {
        return { ok: false, message: "2Chat reports this account as blocked" };
      }
      return { ok: true };
    }
    if (res.ok) return { ok: false, message: "2Chat answered 2xx with an unexpected body shape" };
    return { ok: false, message: `2Chat returned ${formatError(res.status, body)}` };
  },

  /**
   * Label the Connection with the account it is bound to. `/info`'s `account` carries a display
   * name, uuid, trial flag and expiry — identity metadata only, never the key — so it is safe to
   * lift onto the Connection's `display`.
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return {};
    const res = await ctx.fetch(`${API_URL}/info`, {
      headers: { accept: "application/json", "x-user-api-key": apiKey },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => undefined) as InfoBody | undefined;
    const account = body?.account;
    if (!account) return {};
    return {
      accountName: account.name,
      accountUuid: account.uuid,
      onTrial: account.on_trial,
    };
  },
};

export default apiKey;
