import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List projects, filtered, sorted and paged (`GET /projects`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  status?: number;
  projectType?: number;
  companyId?: number;
  responsibleId?: number;
  workflowId?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List projects, filtered, sorted and paged (`GET /projects`).",
  params: [
    {
      "key": "query",
      "label": "Search text",
      "type": "string",
      "hint": "Free-text search over the project.",
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "hint": "1 = active, 2 = archived.",
      "options": [{ "value": 1, "label": "Active" }, { "value": 2, "label": "Archived" }],
    },
    {
      "key": "projectType",
      "label": "Project type",
      "type": "select",
      "hint": "1 = internal overhead, 2 = billable client work.",
      "options": [{ "value": 1, "label": "Internal" }, { "value": 2, "label": "Client" }],
    },
    { "key": "companyId", "label": "Company ID", "type": "number" },
    { "key": "responsibleId", "label": "Responsible person ID", "type": "number" },
    { "key": "workflowId", "label": "Workflow ID", "type": "number" },
    ...listParams(
      "`name`, `-created_at`, `last_activity_at`, `project_number`, `company_name`; prefix `-` for descending.",
    ),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/projects", {
      query: listQuery(input, {
        "query": input.query,
        "status": input.status,
        "project_type": input.projectType,
        "company_id": input.companyId,
        "responsible_id": input.responsibleId,
        "workflow_id": input.workflowId,
      }),
    });
    return items;
  },
};

export default projectList;
