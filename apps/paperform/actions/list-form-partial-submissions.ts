import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import {
  type PaginationInput,
  paginationOutput,
  paginationParams,
  paginationQuery,
  slugOrIdParam,
  withPagination,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  slugOrId: string;
}

interface PartialSubmissionsPage {
  // Paperform's own OAS document keys this response `"partial-submissions"` (hyphenated),
  // unlike the snake_case used everywhere else in the API (`space_id`, `custom_slug`, …) —
  // confirmed by reading the response schema, not assumed from the endpoint's own path.
  "partial-submissions"?: unknown[];
}

/**
 * `GET /forms/{slug_or_id}/partial-submissions` — list partial (in-progress, not yet
 * submitted) submissions for a form.
 */
const listFormPartialSubmissions: ActionDefinition<Input> = {
  key: "list-form-partial-submissions",
  type: "search",
  resource: "partial-submission",
  title: "List Form Partial Submissions",
  description: "List partial (in-progress, not yet submitted) submissions for a form.",
  params: [slugOrIdParam, ...paginationParams()],
  output: paginationOutput,

  async execute(input, ctx) {
    const page = await new PaperformClient(ctx).page<PartialSubmissionsPage>(
      `/forms/${encodeURIComponent(input.slugOrId)}/partial-submissions`,
      { query: paginationQuery(input) },
    );
    return withPagination(page.results?.["partial-submissions"], page);
  },
};

export default listFormPartialSubmissions;
