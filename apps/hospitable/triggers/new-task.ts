import type { Param } from "@w6w/types";
import { boundedList } from "../lib/triggers.ts";
import taskList from "../actions/task-list.ts";

const PROPERTY_IDS: Param = {
  key: "propertyIds",
  label: "Property UUIDs",
  type: "text",
  required: true,
  hint: "One or more property UUIDs (from List Properties), comma or newline separated.",
};

export default boundedList({
  key: "new-task",
  title: "New Task",
  description: "The run gets each operations task newly created for the chosen properties.",
  action: taskList as never,
  paged: true,
  params: [PROPERTY_IDS],
  input: (params) => ({ property_ids: params.propertyIds }),
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "task-1", title: "Turnover clean", status: "pending" },
});
