import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { employeeIdParam } from "../lib/params.ts";

interface Input {
  employeeId: string;
  taskStatus?: "open" | "closed";
}

/** `GET /v1/tasks/people/{id}` — one employee's tasks; no `task_status` returns open and closed. */
const tasksPersonList: ActionDefinition<Input> = {
  key: "tasks-person-list",
  type: "read",
  resource: "task",
  title: "List Employee Tasks",
  description: "List the tasks of one employee, optionally only open or only closed.",
  params: [
    employeeIdParam,
    {
      key: "taskStatus",
      label: "Status",
      type: "select",
      options: [
        { value: "", label: "Open and closed" },
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
      ],
    },
  ],
  output: [{ key: "tasks", type: "array", label: "Tasks" }],

  async execute(input, ctx) {
    return await new HibobClient(ctx).get(`/tasks/people/${encodeId(input.employeeId)}`, {
      task_status: input.taskStatus || undefined,
    });
  },
};

export default tasksPersonList;
