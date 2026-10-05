import type { AuthDefinition } from "@w6w/types";
import { accountBase, isSuiteTalkUrl, normaliseAccountId } from "../lib/client.ts";
import { classifyProbe, PROBE_PATH } from "../lib/probe.ts";

/**
 * OAuth 2.0 authorization-code flow with PKCE — Oracle's preferred method.
 *
 * Verified 2026-10-05 against "OAuth 2.0 Authorization Code Grant Flow" (steps one and two) and
 * "OAuth 2.0 Authorization Header for REST Web Services":
 *
 * - Authorize: `https://<accountID>.app.netsuite.com/app/login/oauth2/authorize.nl`, scope
 *   `rest_webservices` (space-separated if more are ever added), `code_challenge_method=S256`.
 *   `plain` has not been accepted since 2020.2 and, from 2027.1, PKCE is mandatory for new
 *   integrations whatever the client type — hence `pkce: true`.
 * - Token: `POST https://<accountID>.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`
 *   with the client id/secret as HTTP Basic.
 * - Calls: `Authorization: Bearer <access token>` on the account's REST host.
 *
 * Both endpoints are per account, so — like ServiceNow and Zendesk — the URLs carry an
 * `{accountId}` placeholder the host fills from the collected `accountId` field. The host
 * substitutes the value verbatim, so the field is pinned to the lowercase-hyphen hostname form.
 *
 * Requires an Integration record in the target account (Setup > Integration > Manage Integrations)
 * with "Authorization Code Grant" enabled and a redirect URI of this w6w installation.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth 2.0 (recommended)",
  description:
    "Requires an Integration record in your NetSuite account with the Authorization Code Grant " +
    "and the REST Web Services scope enabled, and a matching client registered on this w6w " +
    "installation.",
  connectionLabel: "NetSuite ({{accountId}})",
  fields: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      placeholder: "1234567 or 1234567-sb1",
      hint: "Your NetSuite account id as it appears in your hostname — lowercase, with a hyphen " +
        "instead of an underscore for sandboxes (`1234567_SB1` becomes `1234567-sb1`). See " +
        "Setup > Company > Company Information > Company URLs.",
      validation: { pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
    },
  ],
  oauth2: {
    authorizationUrl: "https://{accountId}.app.netsuite.com/app/login/oauth2/authorize.nl",
    tokenUrl: "https://{accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token",
    scopes: ["rest_webservices"],
    scopeSeparator: " ",
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    // Never attach the bearer token to a host that is not a per-account SuiteTalk host.
    if (!isSuiteTalkUrl(request.url)) {
      throw new Error("Refusing to sign a request to a non-SuiteTalk host.");
    }
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accountId, accessToken } = credential as {
      accountId?: string;
      accessToken?: string;
    };
    if (!accountId || !accessToken) {
      return { ok: false, message: "credential missing accountId or accessToken" };
    }
    let base: string;
    try {
      base = accountBase(accountId);
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
    const res = await ctx.fetch(`${base}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    });
    return await classifyProbe(res);
  },

  /** The exchanged token carries no account label, so record the collected account id. */
  afterConnect({ credential }) {
    const { accountId } = credential as { accountId?: string };
    return Promise.resolve(accountId ? { accountId: normaliseAccountId(accountId) } : {});
  },
};

export default oauth2;
