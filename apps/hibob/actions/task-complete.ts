import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { requireString } from "../lib/params.ts";

interface Input {
  taskId: string | number;
}

/** `POST /v1/tasks/{taskId}/complete` — mark a task complete. Answers `{ toDosUpdated }`. */
const taskComplete: ActionDefinition<Input> = {
  key: "task-complete",
  type: "perform",
  idempotent: true,
  resource: "task",
  title: "Complete Task",
  description: "Mark a task as complete.",
  params: [{ key: "taskId", label: "Task ID", type: "string", required: true }],
  output: [{ key: "toDosUpdated", type: "number", label: "Number of tasks updated" }],

  async execute(input, ctx) {
    const id = requireString(input.taskId, "taskId");
    return await new HibobClient(ctx).post(`/tasks/${encodeId(id)}/complete`);
  },
};

export default taskComplete;
