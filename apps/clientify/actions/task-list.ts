import type { ActionDefinition } from "@w6w/types";
import { asObject, ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/tasks/` — List tasks. `statusId`: 1 not started, 2 in progress, 3 deferred, 4 waiting, 5 completed, 6 expired. due_date/created/modified filters with [gt]/[lt]/[gte]/[lte] go in `filters`.
 */
interface Input {
  statusId?: string;
  page?: number;
  filters?: unknown;
}

const taskList: ActionDefinition<Input, unknown> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description:
    "List tasks. `statusId`: 1 not started, 2 in progress, 3 deferred, 4 waiting, 5 completed, 6 expired. due_date/created/modified filters with [gt]/[lt]/[gte]/[lte] go in `filters`.",
  params: [
    {
      key: "statusId",
      label: "Status",
      type: "select",
      options: [
        { value: "1", label: "Not started" },
        { value: "2", label: "In progress" },
        { value: "3", label: "Deferred" },
        { value: "4", label: "Waiting" },
        { value: "5", label: "Completed" },
        { value: "6", label: "Expired" },
      ],
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number; Clientify returns at most 100 results per page.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "filters",
      label: "Extra filters",
      type: "json",
      hint:
        'Further query filters as a JSON object, e.g. {"created[gt]": "2024/01/01", "modified[lt]": "2024/02/01"}. Named parameters win on a clash.',
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total matches" },
    { key: "next", type: "string", label: "URL of the next page, or null" },
    { key: "previous", type: "string", label: "URL of the previous page, or null" },
    { key: "results", type: "array", label: "Records on this page" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/tasks/`, {
      method: "GET",
      query: {
        ...asObject(input.filters, "filters"),
        "status_id": input.statusId,
        "page": input.page,
      },
    });
  },
};

export default taskList;
