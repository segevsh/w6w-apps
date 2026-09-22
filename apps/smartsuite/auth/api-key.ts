import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Workspace (Account) ID + API token (`custom`) — SmartSuite authenticates with
 * **two** headers, not one, which is why this is `custom` rather than `bearer`
 * or `apiKey`:
 *
 *   authorization: Token <apiKey>
 *   account-id:    <accountId>
 *
 * The scheme comes from SmartSuite's own auth document
 * (<https://developers.smartsuite.com/docs/authentication>): *"SmartSuite's API
 * uses token-based authentication… The header value should be formatted with the
 * word Token, followed by a space, then the API token. Example:
 * `Authorization: Token YOUR_TOKEN`"*. Every documented endpoint additionally
 * requires an `ACCOUNT-ID` header carrying the Workspace ID, which is visible in
 * the SmartSuite UI URL/settings.
 *
 * The **two fields fail independently**, and SmartSuite reports them in a
 * specific order: the account id is validated *before* the token is even looked
 * at. That is what shapes `test` below rather than a bare status-code check.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "Workspace ID & API Key",
  description:
    "From SmartSuite: the Workspace (Account) ID from your workspace URL/settings, and an API " +
    "Key from your profile menu. Sent as the `ACCOUNT-ID` and `Authorization: Token …` headers.",
  connectionLabel: "{{accountId}}",
  fields: [
    {
      key: "accountId",
      label: "Workspace (Account) ID",
      type: "string",
      required: true,
      hint: "From your SmartSuite workspace URL/settings — sent as the ACCOUNT-ID header.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From your SmartSuite profile menu → API Key (Administrators see it directly; " +
        "other roles find it further down the same menu).",
    },
  ],

  /** The only hook handed the credential. It stamps both headers and returns. */
  sign({ request, credential }) {
    const { accountId, apiKey } = credential as { accountId: string; apiKey: string };
    request.headers["authorization"] = `Token ${apiKey}`;
    request.headers["account-id"] = accountId;
    return request;
  },

  /**
   * Probe `GET /solutions/` with both headers.
   *
   * The body is read as **text** first because the failure shapes differ:
   * a missing `ACCOUNT-ID` answers `400` with the plain string
   * `Account ID is not specified`, a malformed one answers `400` with
   * `Account ID <value> is not valid`, and a rejected token answers `401`/`403`
   * (or a `400` whose body does not mention the account id). Both account-id
   * checks run before the token is validated, so a `400` mentioning
   * `"Account ID"` is an **accountId** problem, not an **apiKey** one — the
   * distinction an operator needs to fix the right field.
   *
   * Success is `2xx` alone. Nothing about the response is echoed back as a
   * credential signal, and the body is never treated as a success indicator.
   */
  async test({ credential }, ctx) {
    const { accountId, apiKey } = credential as { accountId?: string; apiKey?: string };
    if (!accountId) return { ok: false, message: "credential missing accountId" };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}/solutions/`, {
      headers: {
        "authorization": `Token ${apiKey}`,
        "account-id": accountId,
        "accept": "application/json, text/plain",
      },
    });
    const body = await res.text().catch(() => "");

    if (res.ok) return { ok: true };
    if (body.includes("Account ID")) {
      return {
        ok: false,
        message: `SmartSuite rejected the Workspace (Account) ID (${res.status}): ${body.trim()}`,
      };
    }
    return {
      ok: false,
      message: `SmartSuite rejected the API key (${res.status})${
        body.trim() ? `: ${body.trim()}` : ""
      }`,
    };
  },
};

export default apiKey;
