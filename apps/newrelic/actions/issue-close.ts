import type { ActionDefinition } from "@w6w/types";
import { NewRelicClient } from "../lib/client.ts";
import { ACCOUNT_PARAM } from "../lib/params.ts";

/**
 * `aiIssuesResolveIssue` — close an issue.
 *
 * ## Closing is not fixing, and New Relic will reopen it
 *
 * The condition underneath keeps evaluating. If it is still breaching, the next
 * incident opens a new issue immediately — so closing something that is still
 * broken produces a stream of issues rather than silence, and looks like an
 * alerting fault rather than the unfixed problem it is.
 *
 * Closing is right for an issue whose cause is genuinely resolved, or one that
 * fired on a condition since corrected. To stop notifications while working on
 * something, acknowledging is the honest move and a muting rule is the
 * deliberate one.
 */
const action: ActionDefinition = {
  key: "issue-close",
  type: "perform",
  resource: "issue",
  title: "Close an issue",
  description:
    "Resolve an issue. The condition keeps evaluating — closing something still breaching just " +
    "opens a new issue on the next incident.",
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
    { key: "closed", type: "boolean", label: "Applied" },
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
      aiIssuesResolveIssue?: {
        result?: { issueId?: string };
        error?: { message?: string; type?: string };
      };
    }>(
      `mutation($accountId: Int!, $issueId: ID!) {
        aiIssuesResolveIssue(accountId: $accountId, issueId: $issueId) {
          result { issueId closedBy closedAt }
          error { message type }
        }
      }`,
      { accountId: account, issueId },
    );

    const error = data?.aiIssuesResolveIssue?.error;
    if (error?.message) {
      throw new Error(
        `could not close issue ${issueId}: ${error.type ? `${error.type}: ` : ""}${error.message}`,
      );
    }

    ctx.log("info", "closed a New Relic issue", { issueId });
    return { closed: true, issueId, result: data?.aiIssuesResolveIssue?.result };
  },
};

export default action;
