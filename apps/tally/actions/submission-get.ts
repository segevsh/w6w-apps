import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

interface Input {
  formId: string;
  submissionId: string;
}

/**
 * GET /forms/{formId}/submissions/{submissionId} — one submission.
 *
 * Shaped `{ questions, submission }`: the question set rides along so a caller
 * can resolve each response to its question without a second request.
 */
const submissionGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "submission-get",
  type: "read",
  resource: "submission",
  title: "Get Submission",
  description: "Retrieve a single submission, with the questions needed to label its responses.",
  params: [
    formIdParam,
    {
      key: "submissionId",
      label: "Submission ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Submissions.",
    },
  ],
  output: [
    { key: "submission", type: "object", label: "The submission" },
    { key: "questions", type: "array", label: "The form's questions" },
  ],

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<
      { questions?: unknown[]; submission?: Record<string, unknown> }
    >(
      `/forms/${encodeURIComponent(input.formId)}/submissions/${
        encodeURIComponent(input.submissionId)
      }`,
    );
    return { submission: body?.submission, questions: body?.questions ?? [] };
  },
};

export default submissionGet;
