import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";
import { pagination, updatedAfter } from "../lib/params.ts";

interface Input {
  from?: string;
  to?: string;
  userId?: number;
  projectId?: number;
  companyId?: number;
  taskId?: number;
  billable?: boolean;
  billed?: boolean;
  term?: string;
  page?: number;
  perPage?: number;
  updatedAfter?: string;
}

/**
 * `GET /activities` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. Returns tracked
 * time activities visible to the current user.
 */
const activityList: ActionDefinition<Input> = {
  key: "activity-list",
  type: "search",
  resource: "activity",
  title: "List Activities",
  description: "List tracked time activities. Use the filters to narrow the set.",
  params: [
    { key: "from", label: "From date", type: "date", row: "range" },
    { key: "to", label: "To date", type: "date", row: "range" },
    { key: "projectId", label: "Project ID", type: "number" },
    { key: "companyId", label: "Company ID", type: "number", advanced: true },
    { key: "taskId", label: "Task/service ID", type: "number", advanced: true },
    { key: "userId", label: "User ID", type: "number", advanced: true },
    { key: "billable", label: "Billable only", type: "boolean", advanced: true },
    { key: "billed", label: "Billed only", type: "boolean", advanced: true },
    { key: "term", label: "Search term", type: "string", advanced: true },
    updatedAfter,
    ...pagination,
  ],
  output: [
    { key: "activities", type: "array", label: "Activities" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Entries per page" },
    { key: "total", type: "number", label: "Total records" },
  ],

  async execute(input, ctx) {
    const { items, page } = await new MocoClient(ctx).list("/activities", {
      query: {
        from: input.from,
        to: input.to,
        project_id: input.projectId,
        company_id: input.companyId,
        task_id: input.taskId,
        user_id: input.userId,
        billable: input.billable,
        billed: input.billed,
        term: input.term,
        updated_after: input.updatedAfter,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { activities: items, page: page.page, perPage: page.perPage, total: page.total };
  },
};

export default activityList;
