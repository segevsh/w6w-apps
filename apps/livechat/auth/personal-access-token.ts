import type { AuthDefinition } from "@w6w/types";
import { actionUrl, describeError, errorOf } from "../lib/client.ts";

/**
 * Personal Access Token (`basic`) — the vendor's recommended path for a single account.
 *
 * Verified 2026-10-06 against platform.text.com/docs/authorization/personal-access-tokens: a PAT
 * "uses the Basic authentication scheme", with the **Account ID** as the username and the token as
 * the password, i.e. `Authorization: Basic base64("<accountId>:<token>")`. The Developer Console
 * (Settings > Authorization > Personal Access Tokens) shows the Account ID and the token, and
 * also hands out the already-Base64-encoded pair; this app takes the two parts and encodes them,
 * so the console's pre-encoded string is not what to paste.
 *
 * The vendor's own cURL samples write `Basic <your_personal_access_token>`, which is the
 * encoded pair, not the bare token. Sending the bare token answers 401 `authentication`.
 *
 * The OAuth 2.0 authorization-code flow also exists (for an app installed by many accounts); it is
 * not implemented here.
 *
 * ## The connection test
 *
 * `POST /configuration/action/list_channels`: documented with "Required scopes: -", so it works
 * for a token with any scope set, mutates nothing, and returns channel metadata, never the
 * credential. The verdict comes from the body: an array is a pass, an `authentication` error type
 * is a rejected credential (HTTP 401 on both a missing and a wrong token; only the message
 * differs), and any other vendor error is reported by its own type.
 */
const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "basic",
  displayName: "Personal Access Token",
  description:
    "Developer Console > Settings > Authorization > Personal Access Tokens. Sent as HTTP Basic " +
    "with your Account ID as the username and the token as the password.",
  fields: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      row: "creds",
      hint: "Shown beside the token in the Developer Console.",
    },
    {
      key: "token",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The token itself, not the Base64 string the console also shows.",
    },
  ],

  sign({ request, credential }) {
    const { accountId, token } = credential as { accountId: string; token: string };
    request.headers["authorization"] = `Basic ${btoa(`${accountId}:${token}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accountId, token } = credential as { accountId?: string; token?: string };
    if (!accountId || !token) {
      return { ok: false, message: "credential missing accountId or token" };
    }
    const res = await ctx.fetch(actionUrl("configuration", "list_channels"), {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${accountId}:${token}`)}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: "{}",
    });
    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      return { ok: false, message: `LiveChat returned a non-JSON body (HTTP ${res.status})` };
    }
    const err = errorOf(body);
    if (err) {
      return {
        ok: false,
        message: err.type === "authentication"
          ? `LiveChat rejected the credential: ${describeError(err)}`
          : `LiveChat error: ${describeError(err)}`,
      };
    }
    if (res.ok && Array.isArray(body)) return { ok: true };
    return { ok: false, message: `unexpected response from LiveChat (HTTP ${res.status})` };
  },
};

export default personalAccessToken;
