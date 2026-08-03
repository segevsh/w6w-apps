import type { ActionDefinition } from "@w6w/types";
import { JotformClient, submissionFields } from "../lib/client.ts";

interface Input {
  formId: string;
  answers: Record<string, unknown>;
}

/**
 * POST /form/{formID}/submissions — submit data to a form through the API.
 *
 * Answers are addressed by QUESTION ID, which you get from Get Form Questions.
 * The body is form-encoded as `submission[<qid>]=<value>`, exactly as the
 * docs' example shows:
 *
 *   `-d "submission[1]=answer of Question 1"`
 *   `-d "submission[2_first]=First Name" -d "submission[2_last]=Last Name"`
 *
 * so a multi-field control (full name, address, date) is addressed with the
 * flat `<qid>_<sublabel>` key form.
 *
 * Returns `{ submissionID, URL }`.
 */
const submissionCreate: ActionDefinition<Input> = {
  key: "submission-create",
  type: "perform",
  resource: "submission",
  title: "Create Submission",
  description: "Submit answers to a form, addressed by question ID.",
  // Jotform mints a fresh submission per POST and offers no request key to
  // dedupe on, so a retry creates a second submission.
  idempotent: false,
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "The digits in a form's URL. Get IDs from Get Many Forms.",
    },
    {
      key: "answers",
      label: "Answers",
      type: "json",
      required: true,
      hint:
        'Map of question ID to answer, e.g. {"1": "Hello", "2_first": "John", "2_last": "Doe"}. ' +
        "Use Get Form Questions for the IDs; multi-field controls take `<qid>_<sublabel>` keys. " +
        "Array values are sent as an indexed list for multi-select controls.",
    },
  ],
  output: [
    { key: "submissionID", type: "string", label: "Submission ID" },
    { key: "URL", type: "string", label: "Submission API URL" },
  ],

  // `async` so a malformed `answers` map surfaces as a rejected promise rather
  // than a synchronous throw out of the hook call.
  async execute(input, ctx) {
    ctx.log("info", "creating Jotform submission", { formId: input.formId });
    return await new JotformClient(ctx).content<Record<string, unknown>>(
      `/form/${encodeURIComponent(input.formId)}/submissions`,
      { method: "POST", form: submissionFields(input.answers ?? {}) },
    );
  },
};

export default submissionCreate;
