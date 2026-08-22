import type { ActionDefinition } from "@w6w/types";
import { compact, GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `POST /repos/{owner}/{repo}/pulls/{index}/merge` — verified against Gitea's
 * Swagger document (`repoMergePullRequest`; required `do`).
 *
 * **`force_merge` is the parameter to be careful with.** It merges past failing
 * status checks and unsatisfied branch protection — the rules someone
 * configured precisely so this could not happen from a script. It is offered
 * because emergencies exist, and it is off by default and logged at `warn` when
 * used.
 *
 * **`merge_when_checks_succeed` is not the same as waiting.** It queues the
 * merge and returns immediately; the merge happens later, or never if the
 * checks fail. A workflow that treats the response as "merged" is wrong on
 * every PR whose checks are still running.
 *
 * `delete_branch_after_merge` is irreversible for an unpushed local branch, and
 * is off by default for that reason.
 */
const action: ActionDefinition = {
  key: "pull-request-merge",
  type: "perform",
  resource: "pull-request",
  title: "Merge a pull request",
  description: "Merge a pull request, optionally when its checks pass.",
  // Merging an already-merged PR is an error from Gitea, not a second merge.
  idempotent: true,
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    { key: "pullNumber", label: "PR Number", type: "number", required: true },
    {
      key: "strategy",
      label: "Strategy",
      type: "select",
      required: true,
      default: "merge",
      options: [
        { value: "merge", label: "Merge commit" },
        { value: "rebase", label: "Rebase" },
        { value: "rebase-merge", label: "Rebase and merge commit" },
        { value: "squash", label: "Squash" },
        { value: "fast-forward-only", label: "Fast-forward only" },
      ],
    },
    { key: "title", label: "Merge Title", type: "string", default: "" },
    { key: "message", label: "Merge Message", type: "text", default: "" },
    {
      key: "mergeWhenChecksSucceed",
      label: "Merge When Checks Succeed",
      type: "boolean",
      default: false,
      hint: "QUEUES the merge and returns immediately — the response does not mean merged.",
    },
    {
      key: "deleteBranchAfterMerge",
      label: "Delete Branch After Merge",
      type: "boolean",
      default: false,
    },
    {
      key: "forceMerge",
      label: "Force Merge",
      type: "boolean",
      default: false,
      hint: "Merges past failing checks and branch protection — the rules that exist to stop " +
        "exactly this.",
    },
  ],
  output: [
    { key: "pullNumber", type: "number", label: "PR number" },
    { key: "merged", type: "boolean", label: "Accepted — queued rather than merged if waiting" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const number = Number(p.pullNumber);
    if (!Number.isFinite(number)) throw new Error("`pullNumber` is required");
    const force = p.forceMerge === true;

    const body = compact({
      do: String(p.strategy ?? "merge"),
      merge_title_field: p.title,
      merge_message_field: p.message,
      merge_when_checks_succeed: p.mergeWhenChecksSucceed === true || undefined,
      delete_branch_after_merge: p.deleteBranchAfterMerge === true || undefined,
      force_merge: force || undefined,
    });

    ctx.log(force ? "warn" : "info", "merging a Gitea pull request", {
      owner,
      repo,
      number,
      strategy: body.do,
      forced: force,
    });

    await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/merge`,
      { method: "POST", body },
    );
    return { pullNumber: number, merged: true };
  },
};

export default action;
