import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { type PaginationInput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input extends PaginationInput {}

/**
 * `GET /courses` — list the Courses on this Site.
 *
 * Read-only: the OpenAPI document declares no `POST`/`PUT`/`DELETE` under
 * `/courses`. A Course is created and edited in the Thinkific course builder,
 * not through this API — the closest write surface is Product-level metadata
 * (`products-get`/`products-list`), which is why this app ships no
 * `courses-create`/`courses-update`/`courses-delete` action.
 */
const coursesList: ActionDefinition<Input> = {
  key: "courses-list",
  type: "read",
  resource: "courses",
  title: "List Courses",
  description: "Retrieve a paginated list of Courses on this Site.",
  params: paginationParams(),
  output: [
    { key: "items", type: "array", label: "Courses" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new ThinkificClient(ctx).list("/courses", { query: paginationQuery(input) });
  },
};

export default coursesList;
