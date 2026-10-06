import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List time entries, filtered, sorted and paged (`GET /time_entries`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  personId?: number;
  projectId?: number;
  taskId?: number;
  serviceId?: number;
  dealId?: number;
  date?: string;
  after?: string;
  before?: string;
  billable?: boolean;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const timeEntryList: ActionDefinition<Input> = {
  key: "time-entry-list",
  type: "search",
  resource: "time_entry",
  title: "List Time Entries",
  description: "List time entries, filtered, sorted and paged (`GET /time_entries`).",
  params: [
    { "key": "personId", "label": "Person ID", "type": "number" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    { "key": "taskId", "label": "Task ID", "type": "number" },
    { "key": "serviceId", "label": "Service ID", "type": "number" },
    { "key": "dealId", "label": "Deal ID", "type": "number" },
    { "key": "date", "label": "Date", "type": "date", "hint": "Exact day." },
    { "key": "after", "label": "After", "type": "date", "hint": "On or after this date." },
    { "key": "before", "label": "Before", "type": "date", "hint": "On or before this date." },
    { "key": "billable", "label": "Billable", "type": "boolean" },
    ...listParams("`date`, `-date`, `person_name`, `service_name`, `updated_at`."),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/time_entries", {
      query: listQuery(input, {
        "person_id": input.personId,
        "project_id": input.projectId,
        "task_id": input.taskId,
        "service_id": input.serviceId,
        "deal_id": input.dealId,
        "date": input.date,
        "after": input.after,
        "before": input.before,
        "billable": input.billable,
      }),
    });
    return items;
  },
};

export default timeEntryList;
