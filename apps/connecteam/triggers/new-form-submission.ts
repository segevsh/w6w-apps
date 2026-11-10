import { sinceTrigger } from "../lib/since.ts";
import { collectPages } from "../lib/triggers.ts";
import formSubmissionList from "../actions/form-submission-list.ts";

interface Params {
  formId?: number | string;
}

interface Submission {
  formSubmissionId?: string;
  submissionTimestamp?: number;
}

/** Rows read per check: 40 pages of 100. A window past it is cut with a warning, not stalled. */
const WINDOW_ROWS = 4000;

/**
 * Since-filter (brief 9.1 b): `GET /forms/v1/forms/{formId}/form-submissions` takes
 * `submittingStartTimestamp` ("submitted from this timestamp", Unix seconds) and pages with
 * `limit` (max 100) and `offset`; it documents no sort order
 * (https://developer.connecteam.com/openapi/connecteam-api-documentation.json , verified
 * 2026-11-10). Safeguards 9.8 and 9.9 live in `lib/since.ts`.
 */
export default sinceTrigger<Submission, Params>({
  key: "new-form-submission",
  title: "New Form Submission",
  description: "The run gets each new submission of one Connecteam form.",
  params: [{
    key: "formId",
    label: "Form ID",
    type: "number",
    required: true,
    hint: "The form to watch, e.g. from a form-list result.",
  }],
  async fetchWindow(sinceMs, ctx, params) {
    const formId = Number(params.formId);
    if (!Number.isInteger(formId) || formId < 1) {
      throw new Error("Set Form ID to the form to watch.");
    }
    const rows = await collectPages(
      100,
      async (offset, limit) => {
        const out = await formSubmissionList.execute({
          formId,
          submittingStartTimestamp: Math.floor(sinceMs / 1000),
          limit,
          offset,
        }, ctx) as { formSubmissions?: Submission[] };
        return out.formSubmissions ?? [];
      },
      WINDOW_ROWS,
      true,
    );
    if (rows.length >= WINDOW_ROWS) {
      ctx.log(
        "warn",
        `new-form-submission: window holds ${WINDOW_ROWS}+ submissions; reading the first ${WINDOW_ROWS}`,
      );
    }
    return rows;
  },
  idOf: (s) => String(s.formSubmissionId),
  timeOf: (s) =>
    typeof s.submissionTimestamp === "number" ? s.submissionTimestamp * 1000 : undefined,
  output: [
    { key: "formSubmissionId", type: "string", label: "Submission ID" },
    { key: "formId", type: "number", label: "Form ID" },
    { key: "submissionTimestamp", type: "number", label: "Submitted at (Unix seconds)" },
    { key: "submittingUserId", type: "number", label: "Submitting user ID" },
    { key: "isAnonymous", type: "boolean", label: "Anonymous" },
    { key: "answers", type: "array", label: "Answers" },
  ],
  sample: {
    formSubmissionId: "sub_5d21",
    formId: 4001,
    submissionTimestamp: 1762683600,
    submittingUserId: 9001,
    isAnonymous: false,
    answers: [],
  },
});
