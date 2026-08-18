import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API key as a bearer token, **plus an account id header**.
 *
 * Checkly's own scheme description spells the pair out:
 *
 *   curl -H "Authorization: Bearer [apiKey]" "X-Checkly-Account: [accountId]"
 *
 * ## The account header is not optional, whatever the spec says
 *
 * `X-Checkly-Account` is declared on **188 of the document's 194 operations**.
 * The six without it are not a different kind of endpoint — they are an
 * inconsistency in the document, and `/v1/checks` is one of them. It is set
 * once here, on every request, rather than per action, so no action can be the
 * one that forgets.
 *
 * That matters because a key that can see several accounts and does not say
 * which one it means is the classic wrong-tenant failure: the call succeeds,
 * against someone else's checks.
 *
 * ## One key, no OAuth
 *
 * Checkly issues user API keys from Settings → User → API keys. There is no
 * OAuth flow and no scoped key, so the key carries whatever the user can do.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "A Checkly API key from Settings → User → API keys, plus the account id it should act on. " +
    "Both go on every request — the account id says which account the key means.",
  connectionLabel: "{{accountName}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Checkly → Settings → User → API keys.",
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "Checkly → Settings → Account → General. Sent as `X-Checkly-Account` on every " +
        "request; a key that can see several accounts needs it to know which you mean.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey, accountId } = credential as { apiKey: string; accountId: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    request.headers["x-checkly-account"] = accountId;
    return request;
  },

  /**
   * `GET /v1/accounts/me` is the narrowest call that proves both halves work:
   * the key authenticates, and the account id resolves to an account it can
   * see. Probing `/v1/checks` would pass for a key pointed at the wrong
   * account, which is the failure most worth catching at connect time.
   */
  async test({ credential }, ctx) {
    const { apiKey, accountId } = credential as { apiKey?: string; accountId?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!accountId) return { ok: false, message: "credential missing accountId" };

    const res = await ctx.fetch(`${API_URL}/v1/accounts/me`, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        "x-checkly-account": accountId,
        accept: "application/json",
      },
    });
    if (res.status === 401) {
      return { ok: false, message: "Checkly rejected the API key (401)" };
    }
    if (res.status === 403 || res.status === 404) {
      return {
        ok: false,
        message:
          `the key is valid but cannot reach account "${accountId}" (${res.status}) — check the ` +
          "account id",
      };
    }
    if (!res.ok) return { ok: false, message: `Checkly returned ${res.status}` };
    return { ok: true };
  },

  /** Publishes which account this connection acts on. Never the key. */
  async afterConnect(_input, ctx) {
    const { credential } = _input as { credential: { apiKey?: string; accountId?: string } };
    const display: Record<string, unknown> = { accountId: credential.accountId };
    if (!credential.apiKey || !credential.accountId) return display;
    try {
      const res = await ctx.fetch(`${API_URL}/v1/accounts/me`, {
        headers: {
          authorization: `Bearer ${credential.apiKey}`,
          "x-checkly-account": credential.accountId,
          accept: "application/json",
        },
      });
      if (!res.ok) return display;
      const body = await res.json() as { name?: string; runtimeId?: string };
      display.accountName = body.name;
      // Worth recording: a check's available Node/browser APIs follow the
      // account's default runtime, and it changes between versions.
      display.runtimeId = body.runtimeId;
      return display;
    } catch {
      return display;
    }
  },
};

export default apiKey;
