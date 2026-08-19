import type { ActionDefinition } from "@w6w/types";
import { assertChangeId, CODE_REVIEW_MEANING, daysSince, GerritClient } from "../lib/client.ts";

/**
 * `GET /a/changes/{id}/detail` — one change, with everything that decides
 * whether it can merge.
 *
 * ## `submittable` is the answer; the labels are the reason
 *
 * A change merges when its **submit requirements** are satisfied — usually
 * Code-Review +2 and Verified +1, but a project can define its own. This
 * action returns `submittable` alongside the per-label state, so a workflow
 * can both act and explain.
 *
 * ## A `-2` is a veto that no amount of `+2` overrides
 *
 * Gerrit's Code-Review scale is not additive. `-2` blocks submission outright
 * and only the person who left it (or an administrator) can clear it, while
 * `+1` from three people is still not an approval. Treating the votes as a sum
 * is the commonest misreading of a Gerrit change.
 *
 * ## Unresolved comments block a submit on many projects
 *
 * `unresolved_comment_count` is a submit requirement wherever the project
 * enables it — so a change with every approval and one unanswered comment
 * cannot merge, and nothing in the label state says why.
 */
const action: ActionDefinition = {
  key: "change-get",
  type: "read",
  resource: "change",
  title: "Get a change",
  description:
    "One change with everything that decides whether it merges. Gerrit's votes are NOT ADDITIVE: " +
    "a `-2` blocks outright and three `+1`s are not an approval. Also reports unresolved " +
    "comments, which block a submit on many projects.",
  params: [
    {
      key: "changeId",
      label: "Change",
      type: "string",
      required: true,
      default: "",
      hint: "The change NUMBER, or `project~number`. A bare Change-Id is not unique across " +
        "branches and Gerrit refuses it.",
    },
  ],
  output: [
    { key: "change", type: "object", label: "The change" },
    { key: "number", type: "number", label: "Its number" },
    { key: "subject", type: "string", label: "The commit subject" },
    { key: "status", type: "string", label: "NEW, MERGED or ABANDONED" },
    { key: "isSubmittable", type: "boolean", label: "Whether it can merge now" },
    { key: "labels", type: "object", label: "Each label, and where it stands" },
    { key: "blockingVotes", type: "array", label: "Labels carrying a rejection" },
    { key: "approvedLabels", type: "array", label: "Labels that are satisfied" },
    { key: "unresolvedComments", type: "number", label: "Often a submit requirement in itself" },
    { key: "isWorkInProgress", type: "boolean", label: "Not asking for review yet" },
    { key: "reviewers", type: "array", label: "Who has been asked" },
    { key: "ageDays", type: "number", label: "Days since it was last updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const changeId = assertChangeId(p.changeId);

    const change = await new GerritClient(ctx).request<{
      _number?: number;
      subject?: string;
      status?: string;
      submittable?: boolean;
      work_in_progress?: boolean;
      unresolved_comment_count?: number;
      updated?: string;
      labels?: Record<string, {
        approved?: { name?: string };
        rejected?: { name?: string };
        recommended?: unknown;
        disliked?: unknown;
        blocking?: boolean;
        all?: Array<{ value?: number; name?: string }>;
      }>;
      reviewers?: { REVIEWER?: Array<{ name?: string; email?: string }> };
    }>(`/changes/${encodeURIComponent(changeId)}/detail`);

    const labels = change?.labels ?? {};
    const blockingVotes: string[] = [];
    const approvedLabels: string[] = [];
    const summary: Record<string, string> = {};

    for (const [name, state] of Object.entries(labels)) {
      if (state?.rejected) {
        blockingVotes.push(name);
        summary[name] = `rejected by ${state.rejected.name ?? "somebody"}`;
      } else if (state?.approved) {
        approvedLabels.push(name);
        summary[name] = `approved by ${state.approved.name ?? "somebody"}`;
      } else if (state?.disliked) {
        summary[name] = "negative, and not blocking";
      } else if (state?.recommended) {
        summary[name] = "positive, and not sufficient";
      } else {
        summary[name] = "no score";
      }
    }

    if (blockingVotes.length) {
      ctx.log(
        "info",
        `this change carries a blocking vote on ${blockingVotes.join(", ")} — ${
          CODE_REVIEW_MEANING["-2"]
        }`,
        { changeId },
      );
    }

    const unresolved = Number(change?.unresolved_comment_count ?? 0);
    if (unresolved > 0 && change?.submittable === false && !blockingVotes.length) {
      ctx.log(
        "info",
        "this change has unresolved comments and no blocking vote, which on many projects is " +
          "itself the reason it cannot be submitted",
        { changeId, unresolved },
      );
    }

    return {
      change,
      number: change?._number,
      subject: change?.subject,
      status: change?.status,
      isSubmittable: change?.submittable === true,
      labels: summary,
      blockingVotes,
      approvedLabels,
      unresolvedComments: unresolved,
      isWorkInProgress: change?.work_in_progress === true,
      reviewers: (change?.reviewers?.REVIEWER ?? []).map((reviewer) =>
        reviewer?.name ?? reviewer?.email
      ).filter(Boolean),
      ageDays: daysSince(change?.updated),
    };
  },
};

export default action;
