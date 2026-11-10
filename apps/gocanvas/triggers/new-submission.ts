import type { Param } from "@w6w/types";
import { requiredId, sinceTrigger } from "../lib/triggers.ts";
import submissionList from "../actions/submission-list.ts";

interface Submission {
  id?: number | string;
}

const FORM: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  required: true,
  hint: "The form to watch (Get Many Forms lists the ids). Every version of the form is included.",
};

const STATUS: Param = {
  key: "status",
  label: "Status",
  type: "select",
  options: [
    { value: "completed", label: "completed" },
    { value: "all", label: "all" },
    { value: "in-progress", label: "in-progress" },
  ],
  hint:
    "Which submissions to watch. Leave empty for completed ones (the GoCanvas default); pick all to include unfinished ones.",
};

/**
 * Submissions are read through `GET /submissions?form_id=…&start_date=…` (Get Many Submissions):
 * every item carries `created_at` and `start_date` is "the beginning bounds to search the
 * Submissions' created_at". The webhook trigger (Submission Created) needs a Company Admin or
 * Designer and allows one webhook per form and event; this poll needs only access to the form.
 * Edits are not polled: the list cannot be filtered by `revised_at`, so Submission Edited (webhook)
 * stays the way to react to them.
 *
 * Docs (verified 2026-11-10): https://api.gocanvas.com/api/v3/docs#list-all-submissions
 */
const newSubmission = sinceTrigger({
  key: "new-submission",
  title: "New Submission",
  description:
    "The run gets each new submission of the chosen form (Get Many Submissions). No webhook setup or administrator rights needed.",
  params: [FORM, STATUS],
  action: submissionList,
  input: (p) => {
    const status = String(p.status ?? "").trim();
    return {
      formId: requiredId(p, "formId", "Form ID"),
      ...(status === "" ? {} : { status }),
    };
  },
  idOf: (s) => String((s as Submission).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Submission ID" },
    { key: "form_id", type: "number", label: "Form ID" },
    { key: "submission_number", type: "string", label: "Submission number" },
    { key: "submission_name", type: "string", label: "Submission name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "revision", type: "boolean", label: "Has a revision" },
    { key: "revised_at", type: "string", label: "Revised at" },
    { key: "department_id", type: "number", label: "Department ID" },
    { key: "user_id", type: "number", label: "User ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: 6625009,
    type: "submission",
    client_guid: "049c1544-1ab5-41a1-a249-b8811cfa335c",
    form_id: 346127,
    submission_number: "00003",
    submission_name: null,
    created_at: "2023-10-13T14:10:34Z",
    revision: true,
    revised_at: "2025-04-09T16:43:57Z",
    department_id: 13521,
    user_id: 20079,
    status: "completed",
    device_guid: "BB5E03A7-560C-4419-A99E-5388338C157C",
  },
});

export default newSubmission;
