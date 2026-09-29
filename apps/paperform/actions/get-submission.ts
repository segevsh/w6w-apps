import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { submissionIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `GET /submissions/{id}` — a specific submission by ID, without needing the parent form's
 * slug or ID. Useful when only the submission ID is known (e.g. from a webhook payload).
 */
const getSubmission: ActionDefinition<Input> = {
  key: "get-submission",
  type: "read",
  resource: "submission",
  title: "Get Submission",
  description: "Get a specific submission by ID, without needing the parent form's slug or ID.",
  params: [submissionIdParam],
  output: [{ key: "submission", type: "object", label: "Submission" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<{ submission?: unknown }>(
      `/submissions/${encodeURIComponent(input.id)}`,
    );
    return { submission: results?.submission };
  },
};

export default getSubmission;
