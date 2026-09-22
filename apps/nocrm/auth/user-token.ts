import type { AuthDefinition } from "@w6w/types";
import {
  baseUrl,
  classifyPing,
  PING_PATH,
  type PingBody,
  USER_TOKEN_HEADER,
} from "../lib/client.ts";

/**
 * User token (`X-USER-TOKEN`) — noCRM's user-dependent scheme.
 *
 * The API document's Authentication section is explicit that this is a
 * *different* grant, not a spelling of the API key: "user dependent using a
 * USER token: all the requests will use the privacy of the users and some
 * requests won't be allowed depending of the user rights". Requests are
 * therefore attributed to the token's owner rather than to the account.
 *
 * That difference is load-bearing in at least one documented place:
 *
 *   - Create-a-lead's `user_id` row says the parameter "returns an error in
 *     case you are using the login user method to authenticate (USER token)" —
 *     a user cannot hand a new lead to somebody else through this credential,
 *     so the actions that expose `user_id` carry that warning in their hints.
 *   - Delete-a-lead warns that a user who cannot see a lead "will result in a
 *     404 answer as the lead cannot be found".
 *
 * It is a separate Auth method rather than a mode switch on the API key because
 * the document frames them as two schemes with two headers and two behaviours;
 * the only thing they share is the subdomain, which identifies the account.
 *
 * The probe is the same `GET /api/v2/ping`, sent with `X-USER-TOKEN` instead.
 * The document's Ping API section shows both headers against that one endpoint
 * and states it "Return[s] a status 200 if the API key or the USER token you are
 * using to authenticate your requests is valid."
 */
const userToken: AuthDefinition = {
  key: "user-token",
  type: "apiKey",
  apiKey: { in: "header", name: USER_TOKEN_HEADER },
  displayName: "User Token",
  description: "Connect as a specific noCRM user. Requests run with that user's own privacy and " +
    "permissions, and some are refused depending on the user's rights.",
  connectionLabel: "{{subdomain}}.nocrm.io",
  fields: [
    {
      key: "subdomain",
      label: "Subdomain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.nocrm.io` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "userToken",
      label: "User Token",
      type: "secret",
      required: true,
      hint: "The USER token for the noCRM user these workflows should act as.",
    },
  ],

  sign({ request, credential }) {
    const { userToken } = credential as { userToken: string };
    request.headers[USER_TOKEN_HEADER] = userToken;
    return request;
  },

  async test({ credential }, ctx) {
    const { subdomain, userToken } = credential as { subdomain?: string; userToken?: string };
    if (!subdomain || !userToken) {
      return { ok: false, message: "credential missing subdomain or userToken" };
    }
    const res = await ctx.fetch(`${baseUrl(subdomain)}${PING_PATH}`, {
      headers: { [USER_TOKEN_HEADER]: userToken },
    });
    const body = await res.json().catch(() => ({})) as PingBody;
    return classifyPing(res.status, body);
  },

  /** Records the subdomain on the connection so the client never handles it. */
  afterConnect({ credential }) {
    const { subdomain } = credential as { subdomain?: string };
    if (!subdomain) return {};
    return { subdomain };
  },
};

export default userToken;
