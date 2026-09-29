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

interface SubmissionsPage {
  submissions?: unknown[];
}

/** `GET /forms/{slug_or_id}/submissions` — list completed submissions for a form. */
const listFormSubmissions: ActionDefinition<Input> = {
  key: "list-form-submissions",
  type: "search",
  resource: "submission",
  title: "List Form Submissions",
  description: "List completed submissions for a form.",
  params: [slugOrIdParam, ...paginationParams()],
  output: paginationOutput,

  async execute(input, ctx) {
    const page = await new PaperformClient(ctx).page<SubmissionsPage>(
      `/forms/${encodeURIComponent(input.slugOrId)}/submissions`,
      { query: paginationQuery(input) },
    );
    return withPagination(page.results?.submissions, page);
  },
};

export default listFormSubmissions;
