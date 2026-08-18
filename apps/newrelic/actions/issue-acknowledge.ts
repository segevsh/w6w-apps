import type { ActionDefinition } from "@w6w/types";
import { NewRelicClient } from "../lib/client.ts";
import { ACCOUNT_PARAM } from "../lib/params.ts";

/**
 * `aiIssuesAckIssue` — mark an issue as being looked at.
 *
 * Acknowledging moves an issue from `CREATED` to `ACTIVATED`, which is how
 * everyone else knows somebody has it. It does **not** stop the underlying
 * condition evaluating, does not close anything, and does not silence
 * notifications for future incidents — those are `issue-close` and muting
 * rules respectively.
 *
 * The useful shape for a workflow is: an on-call system claims an issue,
 * acknowledges it here, and the New Relic UI stops showing it as untouched.
 * Doing that without acknowledging is how two people work the same incident.
 */
const action: ActionDefinition = {
  key: "issue-acknowledge",
  type: "perform",
  resource: "issue",
  title: "Acknowledge an issue",
  description:
    "Move an issue to ACTIVATED so everyone can see it is being handled. It does not stop the " +
    "condition evaluating and does not close anything.",
  idempotent: true,
  params: [
    {
      key: "issueId",
      label: "Issue",
      type: "string",
      required: true,
      default: "",
      hint: "From `issue-list`.",
    },
    ACCOUNT_PARAM,
  ],
  output: [
    { key: "acknowledged", type: "boolean", label: "Applied" },
    { key: "issueId", type: "string", label: "The issue" },
    { key: "result", type: "object", label: "What New Relic returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const issueId = String(p.issueId ?? "").trim();
    if (!issueId) throw new Error("`issueId` is required");
    const client = new NewRelicClient(ctx);
    const account = client.account(p.accountId);

    const data = await client.gql<{
      aiIssuesAckIssue?: {
        result?: { issueId?: string; acknowledgedBy?: string };
        error?: { message?: string; type?: string };
      };
    }>(
      `mutation($accountId: Int!, $issueId: ID!) {
        aiIssuesAckIssue(accountId: $accountId, issueId: $issueId) {
          result { issueId acknowledgedBy acknowledgedAt }
          error { message type }
        }
      }`,
      { accountId: account, issueId },
    );

    // This mutation reports a single `error`, not an `errors` list — the shape
    // varies across NerdGraph, which is why each is handled where it is used.
    const error = data?.aiIssuesAckIssue?.error;
    if (error?.message) {
      throw new Error(
        `could not acknowledge issue ${issueId}: ${error.type ? `${error.type}: ` : ""}` +
          `${error.message}. This arrived as an HTTP 200 with no GraphQL errors`,
      );
    }

    ctx.log("info", "acknowledged a New Relic issue", { issueId });
    return { acknowledged: true, issueId, result: data?.aiIssuesAckIssue?.result };
  },
};

export default action;
