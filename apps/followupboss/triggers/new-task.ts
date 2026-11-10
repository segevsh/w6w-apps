import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import searchTasks from "../actions/search-tasks.ts";
import { idOf, records } from "../lib/triggers.ts";

// GET /tasks has no sort argument; Follow Up Boss returns every collection in reverse `id` order
// by default ("Resources are returned in reverse order by id by default"):
// https://docs.followupboss.com/reference/pagination (verified 2026-11-10).
export default pollFromListAction<Record<string, unknown>>({
  key: "new-task",
  title: "New Task",
  description: "The run gets each newly created task in Follow Up Boss.",
  action: searchTasks as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: records,
  idOf,
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "personId", type: "number", label: "Person ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "dueDate", type: "string", label: "Due date" },
    { key: "isCompleted", type: "boolean", label: "Completed" },
  ],
  sample: {
    id: 301,
    personId: 101,
    name: "Call back",
    type: "Call",
    dueDate: "2026-11-12",
    isCompleted: false,
  },
  maxPages: 1,
});
