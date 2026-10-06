import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List task lists, filtered, sorted and paged (`GET /task_lists`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  projectId?: number;
  status?: number;
  folderId?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const tasklistList: ActionDefinition<Input> = {
  key: "tasklist-list",
  type: "search",
  resource: "task_list",
  title: "List Task Lists",
  description: "List task lists, filtered, sorted and paged (`GET /task_lists`).",
  params: [
    { "key": "query", "label": "Search text", "type": "string" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "hint": "Vendor status filter: 1 or 2 (the reference does not label them for task lists).",
      "options": [{ "value": 1, "label": "Open" }, { "value": 2, "label": "Closed" }],
    },
    {
      "key": "folderId",
      "label": "Board ID",
      "type": "number",
      "hint": "The board (the API calls it a folder) the list sits on.",
    },
    ...listParams("`project_name`, `-project_name`, `board_name`, `folder_name`, `company_name`."),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/task_lists", {
      query: listQuery(input, {
        "query": input.query,
        "project_id": input.projectId,
        "status": input.status,
        "folder_id": input.folderId,
      }),
    });
    return items;
  },
};

export default tasklistList;
