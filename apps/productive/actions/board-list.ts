import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List boards, filtered and paged (`GET /boards`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  projectId?: number;
  status?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const boardList: ActionDefinition<Input> = {
  key: "board-list",
  type: "search",
  resource: "board",
  title: "List Boards",
  description: "List boards, filtered and paged (`GET /boards`).",
  params: [
    { "key": "query", "label": "Search text", "type": "string" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "hint": "Vendor status filter: 1 or 2.",
      "options": [{ "value": 1, "label": "Open" }, { "value": 2, "label": "Closed" }],
    },
    ...listParams(
      "Not documented for this resource; the vendor answers 400 on an unsupported sort.",
    ),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/boards", {
      query: listQuery(input, {
        "query": input.query,
        "project_id": input.projectId,
        "status": input.status,
      }),
    });
    return items;
  },
};

export default boardList;
