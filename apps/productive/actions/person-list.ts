import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List people, filtered, sorted and paged (`GET /people`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  status?: number;
  email?: string;
  companyId?: number;
  projectId?: number;
  managerId?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const personList: ActionDefinition<Input> = {
  key: "person-list",
  type: "search",
  resource: "person",
  title: "List People",
  description: "List people, filtered, sorted and paged (`GET /people`).",
  params: [
    { "key": "query", "label": "Search text", "type": "string" },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "hint": "1 = active, 2 = deactivated.",
      "options": [{ "value": 1, "label": "Active" }, { "value": 2, "label": "Deactivated" }],
    },
    { "key": "email", "label": "Email", "type": "string" },
    { "key": "companyId", "label": "Company ID", "type": "number" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    { "key": "managerId", "label": "Manager ID", "type": "number" },
    ...listParams(
      "`name`, `-joined_at`, `email`, `company_name`, `last_seen_at`; prefix `-` for descending.",
    ),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/people", {
      query: listQuery(input, {
        "query": input.query,
        "status": input.status,
        "email": input.email,
        "company_id": input.companyId,
        "project_id": input.projectId,
        "manager_id": input.managerId,
      }),
    });
    return items;
  },
};

export default personList;
