import type { ActionDefinition } from "@w6w/types";
import { recordTriggers } from "../lib/records.ts";
import taskList from "../actions/task-list.ts";

export default recordTriggers({
  noun: "Task",
  action: taskList as unknown as ActionDefinition,
  fields:
    "id,etag,name,status,priority,due_at,complete,assignee{id,name},matter{id,display_number},created_at,updated_at",
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "priority", type: "string", label: "Priority" },
    { key: "due_at", type: "string", label: "Due at" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 2001,
    name: "File motion",
    status: "pending",
    priority: "Normal",
    due_at: "2026-11-20T17:00:00Z",
    created_at: "2026-11-09T09:00:00Z",
    updated_at: "2026-11-09T11:00:00Z",
  },
}).newTrigger;
