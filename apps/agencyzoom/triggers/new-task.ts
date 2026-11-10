import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import taskList from "../actions/task-list.ts";

/**
 * `POST /v1/api/tasks/list` takes `sort` ("Field name used for sorting", example `id`) and `order`
 * (`asc`/`desc`), pages from 0 with a maximum `pageSize` of 200 (OpenAPI `TaskSearchRequest`):
 * newest id first, page 0. https://app.agencyzoom.com/openapi/agencyzoom.yaml
 */
export default pollFromListAction<Record<string, never>>({
  key: "new-task",
  title: "New Task",
  description: "The run gets each new task (call, email, meeting or to-do) in the agency.",
  action: taskList as unknown as ActionDefinition,
  input: () => ({ sort: "id", order: "desc", page: 0, pageSize: 100 }),
  items: (result) => (result as { tasks?: unknown[] }).tasks ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "number", label: "Status (0 open, 1 completed)" },
    { key: "dueDate", type: "string", label: "Due date" },
    { key: "customerId", type: "number", label: "Customer or lead ID" },
    { key: "customerType", type: "string", label: "customer or lead" },
  ],
  sample: {
    id: 9001,
    title: "Call back about renewal",
    status: 0,
    dueDate: "2026-11-12",
    customerId: 501,
    customerType: "customer",
  },
  maxPages: 1,
});
