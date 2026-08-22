import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API key over HTTP Basic — the key is the **username**, the password is empty.
 *
 * That is what the spec's `securitySchemes.api_key` declares (`type: http`,
 * `scheme: basic`) and what the live host expects. Measured 2026-08-18:
 *
 *   GET /v3/account            (no auth)      -> 401 {"error_name":"unauthorized",
 *                                                     "error_msg":"Unauthorized user.
 *                                                      No credentials supplied."}
 *   GET /v3/account  -u bogus: (bad key)      -> 401 {"error_name":"unauthorized",
 *                                                     "error_msg":"Unauthorized api key"}
 *
 * The two messages differ, which is why `test` reports them apart rather than
 * collapsing both into "401".
 *
 * The empty password matters: `btoa(key + ":")`, not `btoa(key)`. A basic
 * header without the colon is rejected the same way a wrong key is, so the
 * mistake looks like a credential problem rather than an encoding one.
 *
 * ## Why `type: "basic"` and not `type: "apiKey"`
 *
 * The credential is conceptually an API key, but `ApiKeyConfig` can only say
 * "put this value, with this prefix, in this header/query/body slot". It cannot
 * say "base64 the value with a colon appended", so `type: "apiKey"` would
 * describe a wire format this app does not use and a host could not reproduce.
 * Basic is genuinely what goes over the wire — same reasoning, and the same
 * shape, as this pack's `bamboohr` app.
 *
 * The password is deliberately not a field: it is not a secret the user has,
 * the protocol discards it, and prompting for it would only invite someone to
 * fill it in.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "An API key from Dropbox Sign → Settings → API. Sent as HTTP Basic with the key as the " +
    "username and an empty password.",
  connectionLabel: "{{accountEmail}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Dropbox Sign → Settings → API → API Keys.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // The key is the username and the password is empty — hence the trailing colon.
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:`)}`;
    return request;
  },

  /**
   * `GET /account` is the narrowest call that proves the key works, and it
   * returns the account it belongs to, which is what `afterConnect` labels the
   * connection with.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}/account`, {
      headers: { authorization: `Basic ${btoa(`${apiKey}:`)}`, accept: "application/json" },
    });
    if (res.status === 401) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        message: body.includes("No credentials supplied")
          ? "Dropbox Sign saw no credentials — the key was not sent (401)"
          : "Dropbox Sign rejected the API key (401)",
      };
    }
    if (!res.ok) return { ok: false, message: `Dropbox Sign returned ${res.status}` };
    return { ok: true };
  },

  /** Publishes who the key belongs to. Never the key. */
  async afterConnect(_input, ctx) {
    const { credential } = _input as { credential: { apiKey?: string } };
    if (!credential.apiKey) return {};
    try {
      const res = await ctx.fetch(`${API_URL}/account`, {
        headers: {
          authorization: `Basic ${btoa(`${credential.apiKey}:`)}`,
          accept: "application/json",
        },
      });
      if (!res.ok) return {};
      const body = await res.json() as {
        account?: { email_address?: string; account_id?: string; is_paid_hs?: boolean };
      };
      return {
        accountEmail: body.account?.email_address,
        accountId: body.account?.account_id,
        // Whether the plan can send non-test requests at all — a free account's
        // key can only ever create test-mode requests.
        paidSignPlan: body.account?.is_paid_hs,
      };
    } catch {
      return {};
    }
  },
};

export default apiKey;
