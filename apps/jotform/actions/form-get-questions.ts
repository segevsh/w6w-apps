import type { ActionDefinition } from "@w6w/types";
import { JotformClient } from "../lib/client.ts";

interface Input {
  formId: string;
}

/**
 * GET /form/{formID}/questions — every question on a form, keyed by question
 * id (`qid`). This is the map you need before writing a submission: Create
 * Submission addresses answers by those same ids.
 *
 * `content` is an OBJECT keyed by qid, not an array — verified against the
 * docs' own response sample.
 */
const formGetQuestions: ActionDefinition<Input> = {
  key: "form-get-questions",
  type: "read",
  resource: "form",
  title: "Get Form Questions",
  description: "List a form's questions, keyed by question ID — the ids Create Submission expects.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "The digits in a form's URL. Get IDs from Get Many Forms.",
    },
  ],
  output: [
    { key: "questions", type: "object", label: "Questions keyed by question ID" },
  ],

  async execute(input, ctx) {
    const questions = await new JotformClient(ctx).content<Record<string, unknown>>(
      `/form/${encodeURIComponent(input.formId)}/questions`,
    );
    return { questions: questions ?? {} };
  },
};

export default formGetQuestions;
