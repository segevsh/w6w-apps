import type { ActionDefinition } from "@w6w/types";
import { assertChangeId, GerritClient } from "../lib/client.ts";

/**
 * `POST /a/changes/{id}/submit` — merge the change.
 *
 * ## This is the irreversible one
 *
 * Submitting writes to the target branch. Depending on the project's submit
 * type that is a merge, a rebase or a cherry-pick, and in every case the
 * result is a commit on a branch other people are building from. There is no
 * un-submit: the remedy is a revert, which is another change.
 *
 * ## `submittable` is the whole gate, and it is knowable beforehand
 *
 * Gerrit refuses a submit whose requirements are unmet, with a 409 whose
 * message names the failure. This action checks first so the refusal is
 * legible — approvals missing, a blocking vote, unresolved comments, or a
 * parent change that has not merged.
 *
 * ## Submitting can merge more than the change named
 *
 * A change with unmerged parents submits its whole dependency chain: Gerrit
 * cannot merge a child without its ancestors. So "submit change 620421" can
 * put four commits on the branch, and only the topmost is the one anybody
 * asked about. This action reports the chain it is about to take with it.
 */
const action: ActionDefinition = {
  key: "change-submit",
  type: "perform",
  resource: "change",
  title: "Submit a change",
  description:
    "Merge a change into its branch — irreversible, since the remedy is a revert rather than an " +
    "undo. Checks `submittable` first so a refusal is legible, and reports the DEPENDENCY CHAIN, " +
    "because submitting a change also merges its unmerged parents.",
  idempotent: true,
  params: [
    { key: "changeId", label: "Change", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "Confirm",
      type: "boolean",
      default: false,
      required: true,
      hint: "This writes to a branch other people build from. There is no un-submit.",
    },
    {
      key: "allowChain",
      label: "Allow merging unmerged parents",
      type: "boolean",
      default: false,
      hint: "Gerrit cannot merge a change without its ancestors, so a submit can put several " +
        "commits on the branch.",
    },
  ],
  output: [
    { key: "changeId", type: "string", label: "Which change" },
    { key: "status", type: "string", label: "MERGED, if it worked" },
    { key: "submitted", type: "boolean", label: "Whether it merged" },
    { key: "alreadyMerged", type: "boolean", label: "Whether it was merged before this ran" },
    { key: "chainLength", type: "number", label: "How many changes went in together" },
    { key: "branch", type: "string", label: "Which branch was written to" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const changeId = assertChangeId(p.changeId);
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` to submit this change. It writes a commit to a branch other people build " +
          "from, and there is no un-submit — the remedy is a revert, which is another change",
      );
    }

    const client = new GerritClient(ctx);
    const change = await client.request<{
      status?: string;
      submittable?: boolean;
      branch?: string;
      _number?: number;
    }>(`/changes/${encodeURIComponent(changeId)}/detail`);

    if (change?.status === "MERGED") {
      return {
        changeId,
        status: "MERGED",
        submitted: false,
        alreadyMerged: true,
        chainLength: 0,
        branch: change?.branch,
      };
    }
    if (change?.status === "ABANDONED") {
      throw new Error(`change ${changeId} is abandoned — restore it before submitting`);
    }
    if (change?.submittable !== true) {
      throw new Error(
        `change ${changeId} is not submittable. Gerrit would answer 409, and \`change-get\` ` +
          "reports which requirement is unmet — a missing approval, a blocking vote, unresolved " +
          "comments, or a parent that has not merged",
      );
    }

    // Gerrit cannot merge a change without its ancestors.
    let chainLength = 1;
    try {
      const related = await client.request<{ changes?: Array<{ status?: string }> }>(
        `/changes/${encodeURIComponent(changeId)}/revisions/current/related`,
      );
      const unmerged = (related?.changes ?? []).filter((entry) => entry?.status === "NEW");
      chainLength = Math.max(1, unmerged.length);
    } catch { /* the chain is context, not a gate */ }

    if (chainLength > 1 && p.allowChain !== true) {
      throw new Error(
        `submitting this change would also merge ${chainLength - 1} unmerged parent change(s) — ` +
          "Gerrit cannot merge a child without its ancestors. Set `allowChain` if that is " +
          "intended",
      );
    }

    const submitted = await client.request<{ status?: string }>(
      `/changes/${encodeURIComponent(changeId)}/submit`,
      { method: "POST", body: {} },
    );

    ctx.log(
      "warn",
      "submitted a change — this wrote to the branch, and undoing it means " +
        "landing a revert",
      { changeId, chainLength },
    );

    return {
      changeId,
      status: submitted?.status ?? "MERGED",
      submitted: true,
      alreadyMerged: false,
      chainLength,
      branch: change?.branch,
    };
  },
};

export default action;
