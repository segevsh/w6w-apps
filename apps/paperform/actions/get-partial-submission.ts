import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { partialSubmissionIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

// See list-form-partial-submissions.ts: Paperform's own OAS keys this response
// `"partial-submission"` (hyphenated), unlike the snake_case used elsewhere in the API.
interface PartialSubmissionResult {
  "partial-submission"?: unknown;
}

/**
 * `GET /partial-submissions/{id}` — a partial submission by ID, without needing the parent
 * form's slug or ID.
 */
const getPartialSubmission: ActionDefinition<Input> = {
  key: "get-partial-submission",
  type: "read",
  resource: "partial-submission",
  title: "Get Partial Submission",
  description: "Get a specific partial (in-progress, not yet submitted) submission by ID, " +
    "without needing the parent form's slug or ID.",
  params: [partialSubmissionIdParam],
  output: [{ key: "partialSubmission", type: "object", label: "Partial submission" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<PartialSubmissionResult>(
      `/partial-submissions/${encodeURIComponent(input.id)}`,
    );
    return { partialSubmission: results?.["partial-submission"] };
  },
};

export default getPartialSubmission;
