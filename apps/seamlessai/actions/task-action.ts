import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, segment } from "../lib/client.ts";

/** `POST /api/client/v2/tasks/{id}/actions` — Run Task Action. */
interface Input {
  id: string;
  action: string;
}

const taskAction: ActionDefinition<Input> = {
  key: "task-action",
  type: "perform",
  resource: "task",
  title: "Run Task Action",
  description:
    "Pause, reschedule, unpause, cancel, start, delete, skip, complete or schedule a task.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Task ID from the matching list action.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      options: [
        { value: "pause", label: "pause" },
        { value: "reschedule", label: "reschedule" },
        { value: "unpause", label: "unpause" },
        { value: "cancel", label: "cancel" },
        { value: "start", label: "start" },
        { value: "delete", label: "delete" },
        { value: "skip", label: "skip" },
        { value: "complete", label: "complete" },
        { value: "schedule", label: "schedule" },
      ],
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "taskId and action" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "POST",
      `/tasks/${segment(input.id, "Task ID")}/actions`,
      { body: compact({ action: need(input.action, "Action") }) },
    );
  },
};

export default taskAction;
