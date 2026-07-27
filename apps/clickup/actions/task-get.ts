import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  taskId: string;
  includeSubtasks?: boolean;
  customTaskIds?: boolean;
  teamId?: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Retrieve a single task by ID.",
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
    { key: "includeSubtasks", label: "Include subtasks", type: "boolean", default: false },
    {
      key: "customTaskIds",
      label: "Use custom task ID",
      type: "boolean",
      default: false,
      hint: "Treat the Task ID as a custom ID; requires the Team (workspace) ID below.",
    },
    {
      key: "teamId",
      label: "Team (workspace) ID",
      type: "string",
      hint: "Required for custom IDs.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "object", label: "Status" },
    { key: "url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new ClickUpClient(ctx).request(
      `/task/${encodeURIComponent(input.taskId)}`,
      {
        query: {
          include_subtasks: input.includeSubtasks ? true : undefined,
          custom_task_ids: input.customTaskIds ? true : undefined,
          team_id: input.customTaskIds ? input.teamId : undefined,
        },
      },
    );
  },
};

export default taskGet;
