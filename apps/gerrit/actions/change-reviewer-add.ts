import type { ActionDefinition } from "@w6w/types";
import { assertChangeId, compact, GerritClient } from "../lib/client.ts";

/**
 * `POST /a/changes/{id}/reviewers` — ask somebody to look.
 *
 * ## Adding a reviewer is asking a person for their time
 *
 * It notifies them and puts the change in their dashboard. Automating it is
 * reasonable — round-robin assignment, code-owner routing — and automating it
 * badly produces a review queue nobody trusts.
 *
 * ## `CC` is the way to inform without asking
 *
 * A CC receives the notifications and is not expected to review. That is the
 * right state for "the team that owns this directory should know" as against
 * "you specifically must look at this", and Gerrit distinguishes them where
 * most review tools do not.
 *
 * ## Adding a group can add a great many people
 *
 * Gerrit accepts a group name where it accepts an account, and expands it.
 * A workflow that adds `everyone` to a change notifies everyone, so this
 * action reports how many reviewers were actually added rather than assuming
 * one.
 *
 * ## Gerrit answers 200 with a per-reviewer error
 *
 * An unresolvable name comes back inside a successful response rather than as
 * a failure — the same shape as a bulk endpoint. This action surfaces it.
 */
const action: ActionDefinition = {
  key: "change-reviewer-add",
  type: "perform",
  resource: "change",
  title: "Add a reviewer",
  description:
    "Ask somebody to review, or CC them — Gerrit distinguishes 'you must look' from 'you should " +
    "know', which most review tools do not. A GROUP name expands to its members, and an " +
    "unresolvable name comes back inside a 200 rather than as an error.",
  idempotent: true,
  params: [
    { key: "changeId", label: "Change", type: "string", required: true, default: "" },
    {
      key: "reviewer",
      label: "Reviewer",
      type: "string",
      required: true,
      default: "",
      hint: "A username, an email, an account id — or a GROUP name, which expands to every " +
        "member.",
    },
    {
      key: "state",
      label: "State",
      type: "select",
      default: "REVIEWER",
      options: [
        { value: "REVIEWER", label: "Reviewer — expected to look" },
        { value: "CC", label: "CC — notified, not asked" },
      ],
    },
    {
      key: "notify",
      label: "Notify",
      type: "select",
      default: "ALL",
      advanced: true,
      options: [
        { value: "ALL", label: "Everyone on the change" },
        { value: "OWNER_REVIEWERS", label: "The owner and reviewers" },
        { value: "OWNER", label: "The owner only" },
        { value: "NONE", label: "Nobody — add silently" },
      ],
    },
  ],
  output: [
    { key: "changeId", type: "string", label: "Which change" },
    { key: "added", type: "array", label: "Who was actually added" },
    { key: "addedCount", type: "number", label: "How many people, after group expansion" },
    { key: "state", type: "string", label: "As a reviewer or a CC" },
    { key: "error", type: "string", label: "What Gerrit said if it could not resolve the name" },
    { key: "succeeded", type: "boolean", label: "Whether anybody was added" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const changeId = assertChangeId(p.changeId);
    const reviewer = String(p.reviewer ?? "").trim();
    if (!reviewer) throw new Error("`reviewer` is required");
    const state = String(p.state ?? "REVIEWER");

    const result = await new GerritClient(ctx).request<{
      reviewers?: Array<{ name?: string; email?: string; username?: string }>;
      ccs?: Array<{ name?: string; email?: string; username?: string }>;
      error?: string;
    }>(`/changes/${encodeURIComponent(changeId)}/reviewers`, {
      method: "POST",
      body: compact({
        reviewer,
        state,
        notify: String(p.notify ?? "ALL"),
      }),
    });

    // A name Gerrit cannot resolve comes back inside a 200.
    if (result?.error) {
      ctx.log(
        "warn",
        "Gerrit answered successfully and reported an error for this reviewer — an unresolvable " +
          "name is not a failed request",
        { changeId, error: result.error },
      );
    }

    const added = [...(result?.reviewers ?? []), ...(result?.ccs ?? [])]
      .map((person) => person?.username ?? person?.name ?? person?.email)
      .filter(Boolean) as string[];

    // A group expands, and everybody in it is notified.
    if (added.length > 1) {
      ctx.log(
        "info",
        `this added ${added.length} people — the name given resolved to a group, and every ` +
          "member has been notified",
        { changeId },
      );
    }

    return {
      changeId,
      added,
      addedCount: added.length,
      state,
      error: result?.error,
      succeeded: added.length > 0,
    };
  },
};

export default action;
