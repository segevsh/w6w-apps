import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { partialSubmissionIdParam, slugOrIdParam } from "../lib/params.ts";

interface Input {
  slugOrId: string;
  id: string;
}

// See list-form-partial-submissions.ts: Paperform's own OAS keys this response
// `"partial-submission"` (hyphenated), unlike the snake_case used elsewhere in the API.
interface PartialSubmissionResult {
  "partial-submission"?: unknown;
}

/** `GET /forms/{slug_or_id}/partial-submissions/{id}` — a partial submission, scoped to a form. */
const getFormPartialSubmission: ActionDefinition<Input> = {
  key: "get-form-partial-submission",
  type: "read",
  resource: "partial-submission",
  title: "Get Form Partial Submission",
  description: "Get a specific partial (in-progress, not yet submitted) submission by ID, " +
    "scoped to a form.",
  params: [slugOrIdParam, partialSubmissionIdParam],
  output: [{ key: "partialSubmission", type: "object", label: "Partial submission" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<PartialSubmissionResult>(
      `/forms/${encodeURIComponent(input.slugOrId)}/partial-submissions/${
        encodeURIComponent(input.id)
      }`,
    );
    return { partialSubmission: results?.["partial-submission"] };
  },
};

export default getFormPartialSubmission;
