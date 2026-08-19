import type { ActionDefinition } from "@w6w/types";
import { assertChangeId, CODE_REVIEW_MEANING, compact, GerritClient, json } from "../lib/client.ts";

/**
 * `POST /a/changes/{id}/revisions/current/review` — vote, and say why.
 *
 * ## The vote a bot should leave is `Verified`, not `Code-Review`
 *
 * `Verified +1` is what CI is for: this built and the tests passed.
 * `Code-Review +2` is a human saying they have read the code and take
 * responsibility for it, and a project that lets an automation grant it has
 * given up the thing Gerrit exists to provide.
 *
 * This action will send either — that is the account's permissions to decide,
 * not this app's — and it says which one it is sending.
 *
 * ## The scale is not additive
 *
 * `-2` blocks submission outright and no number of `+2`s overrides it; three
 * `+1`s are not an approval. A workflow that treats votes as a sum is reading
 * Gerrit as though it were a pull request.
 *
 * ## Voting on `current` is not the same as voting on a revision
 *
 * A vote lands on a specific patch set. Reviewing `current` and having somebody
 * push a new patch set a second later leaves the vote on the old one — Gerrit
 * may or may not carry it forward, depending on the project's copy conditions.
 * That is why this action reports which revision it voted on.
 */
const action: ActionDefinition = {
  key: "change-review",
  type: "perform",
  resource: "change",
  title: "Review a change",
  description:
    "Vote on a change and leave a message. `Verified` is the label CI should use; `Code-Review " +
    "+2` is a person taking responsibility for the code. The scale is NOT ADDITIVE — a `-2` " +
    "blocks outright and three `+1`s are not an approval.",
  idempotent: true,
  params: [
    { key: "changeId", label: "Change", type: "string", required: true, default: "" },
    {
      key: "message",
      label: "Message",
      type: "text",
      default: "",
      hint: "Posted as a comment on the change. A vote with no explanation is a bad review " +
        "whoever leaves it.",
    },
    {
      key: "label",
      label: "Label",
      type: "string",
      default: "Verified",
      hint: "`Verified` for automation; `Code-Review` is a human judgement. Projects can define " +
        "others.",
    },
    {
      key: "value",
      label: "Value",
      type: "number",
      default: 0,
      hint: "-2 blocks submission outright and only its author can clear it. +2 approves. " +
        "0 leaves the message with no vote.",
    },
    {
      key: "revision",
      label: "Revision",
      type: "string",
      default: "current",
      advanced: true,
      hint: "A vote lands on one patch set. `current` races with anybody pushing a new one.",
    },
    {
      key: "extraLabels",
      label: "Additional labels",
      type: "json",
      default: "",
      advanced: true,
      placeholder: '{"Code-Review":1}',
    },
  ],
  output: [
    { key: "changeId", type: "string", label: "Which change" },
    { key: "labels", type: "object", label: "What was voted" },
    { key: "revision", type: "string", label: "Which patch set the vote landed on" },
    { key: "posted", type: "boolean", label: "Whether the review was recorded" },
    { key: "isBlocking", type: "boolean", label: "Whether this vote blocks submission" },
    { key: "isApproval", type: "boolean", label: "Whether this vote is sufficient to submit" },
    { key: "meaning", type: "string", label: "What this value means on Gerrit's scale" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const changeId = assertChangeId(p.changeId);
    const message = String(p.message ?? "").trim();
    const labelName = String(p.label ?? "Verified").trim();
    const value = Number(p.value ?? 0);

    if (!Number.isInteger(value) || value < -2 || value > 2) {
      throw new Error(
        `\`value\` must be an integer between -2 and +2 — got ${p.value}. Gerrit's scale is not ` +
          "a rating; -2 is a veto and +2 is an approval",
      );
    }
    if (!message && value === 0) {
      throw new Error(
        "a review with no message and no vote does nothing. Give a `message`, a `value`, or both",
      );
    }

    const extra = json(p.extraLabels, "extraLabels") as Record<string, number> | undefined;
    const labels: Record<string, number> = { ...(extra ?? {}) };
    if (labelName && value !== 0) labels[labelName] = value;

    if (/code-review/i.test(labelName) && value === 2) {
      ctx.log(
        "warn",
        "this is a Code-Review +2, which in Gerrit means a person has read the code and takes " +
          "responsibility for it. `Verified` is the label automation is meant to use",
        { changeId },
      );
    }
    if (value === -2) {
      ctx.log(
        "warn",
        "a -2 blocks submission outright and only whoever left it, or an administrator, can " +
          "clear it — no number of +2s overrides it",
        { changeId },
      );
    }

    const revision = String(p.revision ?? "current").trim() || "current";
    await new GerritClient(ctx).request(
      `/changes/${encodeURIComponent(changeId)}/revisions/${encodeURIComponent(revision)}/review`,
      {
        method: "POST",
        body: compact({
          message: message || undefined,
          labels: Object.keys(labels).length ? labels : undefined,
        }),
      },
    );

    // Ids and votes. The message is somebody's review comment.
    ctx.log("info", "posted a Gerrit review", { changeId, labels });

    return {
      changeId,
      labels,
      revision,
      posted: true,
      isBlocking: value === -2,
      isApproval: value === 2,
      meaning: CODE_REVIEW_MEANING[value > 0 ? `+${value}` : String(value)],
    };
  },
};

export default action;
