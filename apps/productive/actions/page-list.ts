import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List Docs pages, filtered, sorted and paged (`GET /pages`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  projectId?: number;
  parentPageId?: number;
  creatorId?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const pageList: ActionDefinition<Input> = {
  key: "page-list",
  type: "search",
  resource: "page",
  title: "List Docs Pages",
  description: "List Docs pages, filtered, sorted and paged (`GET /pages`).",
  params: [
    { "key": "query", "label": "Search text", "type": "string" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    { "key": "parentPageId", "label": "Parent page ID", "type": "number" },
    { "key": "creatorId", "label": "Creator ID", "type": "number" },
    ...listParams(
      "`title`, `-edited_at`, `created_at`, `project_name`; prefix `-` for descending.",
    ),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/pages", {
      query: listQuery(input, {
        "query": input.query,
        "project_id": input.projectId,
        "parent_page_id": input.parentPageId,
        "creator_id": input.creatorId,
      }),
    });
    return items;
  },
};

export default pageList;
