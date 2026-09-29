import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { slugOrIdParam, submissionIdParam } from "../lib/params.ts";

interface Input {
  slugOrId: string;
  id: string;
}

/** `GET /forms/{slug_or_id}/submissions/{id}` — a specific submission by ID, scoped to a form. */
const getFormSubmission: ActionDefinition<Input> = {
  key: "get-form-submission",
  type: "read",
  resource: "submission",
  title: "Get Form Submission",
  description: "Get a specific submission by ID, scoped to a form.",
  params: [slugOrIdParam, submissionIdParam],
  output: [{ key: "submission", type: "object", label: "Submission" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<{ submission?: unknown }>(
      `/forms/${encodeURIComponent(input.slugOrId)}/submissions/${encodeURIComponent(input.id)}`,
    );
    return { submission: results?.submission };
  },
};

export default getFormSubmission;
