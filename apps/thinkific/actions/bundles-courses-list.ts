import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { idParam, type PaginationInput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input extends PaginationInput {
  id: string;
}

/** `GET /bundles/{id}/courses` — the Courses contained in a Bundle. */
const bundlesCoursesList: ActionDefinition<Input> = {
  key: "bundles-courses-list",
  type: "read",
  resource: "bundles",
  title: "List Courses in Bundle",
  description: "Retrieve the Courses within a Bundle.",
  params: [idParam("Bundle"), ...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Courses" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new ThinkificClient(ctx).list(
      `/bundles/${encodeURIComponent(input.id)}/courses`,
      { query: paginationQuery(input) },
    );
  },
};

export default bundlesCoursesList;
