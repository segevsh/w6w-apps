import type { AuthDefinition } from "@w6w/types";
import { accountBase, isSuiteTalkUrl, normaliseAccountId } from "../lib/client.ts";
import { classifyProbe, PROBE_PATH } from "../lib/probe.ts";
import { tbaAuthorization, type TbaCredential } from "../lib/tba.ts";

/**
 * Token-Based Authentication — OAuth 1.0a with HMAC-SHA256, computed entirely in `sign`.
 *
 * No browser step: an administrator creates an Integration record (consumer key + secret), assigns
 * a TBA role to a user and issues that user a token (token id + secret); those four values plus
 * the account id are the credential.
 *
 * **Deprecation.** Oracle's "Preparing for Token-based Authentication (TBA) End of Support" page
 * says that from NetSuite 2027.1 no new TBA integrations can be created for REST web services,
 * and that support for existing ones ends tentatively in 2028.2. Existing integrations keep
 * working until then, which is why this method is offered next to OAuth 2.0 — for accounts that
 * already have a TBA integration record — and why OAuth 2.0 is the recommended choice.
 *
 * Signing is in `lib/tba.ts` and pinned to Oracle's published known-answer vector.
 */
const tba: AuthDefinition = {
  key: "tba",
  type: "custom",
  displayName: "Token-Based Authentication (existing integrations)",
  description:
    "OAuth 1.0a (HMAC-SHA256) with an Integration record's consumer key/secret and a user " +
    "token id/secret. Oracle stops supporting TBA for new integrations from NetSuite 2027.1; " +
    "prefer OAuth 2.0 for anything new.",
  connectionLabel: "NetSuite TBA ({{accountId}})",
  fields: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      placeholder: "1234567 or 1234567_SB1",
      hint: "As NetSuite shows it (`1234567_SB1` for a sandbox). It becomes the OAuth realm, and " +
        "its lowercase-hyphen form (`1234567-sb1`) selects the REST host.",
      validation: { pattern: "^[A-Za-z0-9]+([_-][A-Za-z0-9]+)*$" },
    },
    { key: "consumerKey", label: "Consumer key", type: "secret", required: true },
    { key: "consumerSecret", label: "Consumer secret", type: "secret", required: true },
    { key: "tokenId", label: "Token ID", type: "secret", required: true },
    { key: "tokenSecret", label: "Token secret", type: "secret", required: true },
  ],

  async sign({ request, credential }) {
    if (!isSuiteTalkUrl(request.url)) {
      throw new Error("Refusing to sign a request to a non-SuiteTalk host.");
    }
    request.headers["authorization"] = await tbaAuthorization(
      request.method,
      request.url,
      credential as TbaCredential,
    );
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<TbaCredential>;
    if (
      !cred.accountId || !cred.consumerKey || !cred.consumerSecret || !cred.tokenId ||
      !cred.tokenSecret
    ) {
      return { ok: false, message: "credential is missing one of the five TBA values" };
    }
    let url: string;
    try {
      url = `${accountBase(cred.accountId)}${PROBE_PATH}`;
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
    const authorization = await tbaAuthorization("GET", url, cred as TbaCredential);
    const res = await ctx.fetch(url, { headers: { accept: "application/json", authorization } });
    return await classifyProbe(res);
  },

  afterConnect({ credential }) {
    const { accountId } = credential as { accountId?: string };
    return Promise.resolve(accountId ? { accountId: normaliseAccountId(accountId) } : {});
  },
};

export default tba;
