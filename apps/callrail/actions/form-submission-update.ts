import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId, toList } from "../lib/client.ts";
import { accountIdParam, leadStatusOptions } from "../lib/params.ts";

/**
 * `PUT /v3/a/{account_id}/form_submissions/{form_submission_id}.json` —
 * Updating a Form Submission.
 */
interface Input {
  accountId: string;
  formSubmissionId: string;
  tags?: string;
  appendTags?: boolean;
  note?: string;
  value?: string;
  leadStatus?: "good_lead" | "not_a_lead";
}

const formSubmissionUpdate: ActionDefinition<Input> = {
  key: "form-submission-update",
  type: "perform",
  resource: "form-submission",
  title: "Update Form Submission",
  description: "Tag or annotate a form submission, set its monetary value, or set its lead " +
    "status.",
  idempotent: true,
  params: [
    accountIdParam,
    {
      key: "formSubmissionId",
      label: "Form Submission ID",
      type: "string",
      required: true,
      placeholder: "FOR8154748ae6bd4e278a7cddd38a662f4f",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag names. New tags are created automatically if they don't " +
        "already exist in the company.",
    },
    {
      key: "appendTags",
      label: "Append tags",
      type: "boolean",
      hint: "On: add to the form submission's existing tags. Off (default): replace them.",
    },
    { key: "note", label: "Note", type: "text" },
    {
      key: "value",
      label: "Value",
      type: "string",
      hint: 'Monetary value of this form submission, e.g. "$1.00" or "1.00".',
    },
    {
      key: "leadStatus",
      label: "Lead status",
      type: "select",
      options: leadStatusOptions.filter((o) => o.value !== "not_scored"),
      hint: 'A form submission already marked "previously_marked_good_lead" cannot be set ' +
        "back to good_lead through this endpoint — CallRail returns 400.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Form submission ID" },
    { key: "form_data", type: "object", label: "Submitted form fields" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/form_submissions/${encodeId(input.formSubmissionId)}.json`,
      {
        method: "PUT",
        body: {
          tags: toList(input.tags),
          append_tags: input.appendTags,
          note: input.note,
          value: input.value,
          lead_status: input.leadStatus,
        },
      },
    );
  },
};

export default formSubmissionUpdate;
