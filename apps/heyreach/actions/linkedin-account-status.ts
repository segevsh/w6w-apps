import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";

interface Input {
  accountId: number;
}

/**
 * `GET /api/public/li_account/GetAccountStatus/{accountId}` — is this sender's
 * LinkedIn session actually connected?
 *
 * The `accountId` is a **path segment** here, not a query parameter: the
 * document declares `GET /api/public/li_account/GetAccountStatus/{accountId}`.
 *
 * This is the follow-up to HeyReach's connection flows (Connect, Reconnect,
 * Resync), none of which this app implements — but the status half is worth
 * having, because it is how a workflow finds out *why* a sender is not sending:
 * `status` is the connection state, `failureReason` explains a failure, and
 * `salesNavigator`/`recruiter` report whether the paid LinkedIn surfaces are
 * authenticated (a campaign node that uses them does nothing without them).
 *
 * The response is cached by HeyReach for 10 seconds, so a poll loop cannot see
 * a change faster than that.
 */
const action: ActionDefinition<Input> = {
  key: "linkedin-account-status",
  type: "read",
  resource: "linkedin-account",
  title: "Get LinkedIn Account Status",
  description:
    "Read one sender account's live connection status, failure reason, and Sales Navigator / " +
    "Recruiter authentication (GET /api/public/li_account/GetAccountStatus/{accountId}).",
  params: [
    {
      key: "accountId",
      label: "LinkedIn account",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The `id` of a sender account, from List LinkedIn Accounts.",
    },
  ],
  output: [
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "status", type: "string", label: "Connection status" },
    { key: "failureReason", type: "string", label: "Why the connection failed, if it did" },
    { key: "profile", type: "object", label: "Connected profile (name, email, URL)" },
    { key: "salesNavigator", type: "object", label: "Sales Navigator authenticated" },
    { key: "recruiter", type: "object", label: "Recruiter authenticated" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request(
      `/li_account/GetAccountStatus/${encodeURIComponent(input.accountId)}`,
    );
  },
};

export default action;
