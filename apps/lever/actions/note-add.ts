import type { ActionDefinition } from "@w6w/types";
import { assertPerformAs, assertUuid, compact, LeverClient, query } from "../lib/client.ts";

/**
 * `POST /v1/opportunities/{id}/notes` — write on a candidate's profile.
 *
 * ## This is the useful half of an integration
 *
 * A note is what a recruiter reads. Putting the result of a background check,
 * an assessment score or a scheduling confirmation *on the candidate* is worth
 * more than the same information in a system nobody opens during a review.
 *
 * ## It is permanent and it is personal data
 *
 * Notes cannot be edited through the API, only deleted. Whatever a workflow
 * writes stays on a person's record, is visible to everybody with access to
 * that candidate, and is discoverable in a data-subject request. Automated
 * notes should be written accordingly — facts and references, not
 * speculation.
 *
 * ## `perform_as` is who says it
 *
 * The note appears under that user's name. A workflow that omits it produces
 * notes attributed to whoever created the API key, which is how a recruiter
 * ends up apparently writing comments at three in the morning.
 *
 * ## Secret notes are visible to fewer people, not to nobody
 *
 * `secret: true` restricts a note to users with the right access rather than
 * hiding it. It is still on the record.
 */
const action: ActionDefinition = {
  key: "note-add",
  type: "perform",
  resource: "note",
  title: "Add a note",
  description:
    "Write on a candidate's profile, which is where recruiters actually look. Notes are " +
    "PERMANENT — the API can delete but not edit — visible to everyone with access to the " +
    "candidate, and discoverable in a data-subject request.",
  idempotent: false,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "string", required: true, default: "" },
    {
      key: "value",
      label: "Note",
      type: "text",
      required: true,
      default: "",
      hint: "Permanent and personal data. Facts and references travel better than judgements.",
    },
    {
      key: "performAs",
      label: "Perform as (user ID)",
      type: "string",
      required: true,
      default: "",
      hint: "Whose name the note appears under.",
    },
    {
      key: "secret",
      label: "Restricted note",
      type: "boolean",
      default: false,
      hint: "Visible to fewer people, not to nobody — it is still on the record.",
    },
    {
      key: "notifyFollowers",
      label: "Notify followers",
      type: "boolean",
      default: false,
      hint: "Sends a notification to everyone following the candidate.",
    },
    {
      key: "createdAt",
      label: "Backdate to (epoch ms)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "For importing history. A note dated before the candidate existed is confusing " +
        "rather than useful.",
    },
  ],
  output: [
    { key: "note", type: "object", label: "The note Lever stored" },
    { key: "id", type: "string", label: "Its id" },
    { key: "opportunityId", type: "string", label: "Which candidate" },
    { key: "secret", type: "boolean", label: "Whether it is restricted" },
    { key: "notifiedFollowers", type: "boolean", label: "Whether anybody was told" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const opportunityId = assertUuid(p.opportunityId, "opportunityId");
    const performAs = assertPerformAs(p.performAs);
    const value = String(p.value ?? "").trim();
    if (!value) throw new Error("`value` is required — an empty note is not worth a record");

    const createdAt = Number(p.createdAt ?? 0);
    const note = await new LeverClient(ctx).one<{ id?: string; secret?: boolean }>(
      `/opportunities/${encodeURIComponent(opportunityId)}/notes`,
      {
        method: "POST",
        query: query({
          perform_as: performAs,
          notify: p.notifyFollowers === true ? "true" : "false",
        }),
        body: compact({
          value,
          secret: p.secret === true ? true : undefined,
          createdAt: createdAt > 0 ? createdAt : undefined,
        }),
      },
    );

    // Ids only. The note itself is what somebody wrote about a person.
    ctx.log("info", "added a Lever note", { opportunityId, id: note?.id });

    return {
      note,
      id: note?.id,
      opportunityId,
      secret: p.secret === true,
      notifiedFollowers: p.notifyFollowers === true,
    };
  },
};

export default action;
