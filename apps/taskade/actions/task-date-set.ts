import type { ActionDefinition } from "@w6w/types";
import { compact, seg, TaskadeClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  taskId: string;
  startDate: string;
  startTime?: string;
  timezone?: string;
  endDate?: string;
  endTime?: string;
}

/** `PUT /projects/{projectId}/tasks/{taskId}/date` */
const taskDateSet: ActionDefinition<Input> = {
  key: "task-date-set",
  type: "perform",
  resource: "task",
  title: "Set Task Date",
  description: "Set a task's due date, optionally with a time, timezone and end date.",
  idempotent: true,
  params: [{
    "key": "projectId",
    "label": "Project ID",
    "type": "string",
    "required": true,
    "hint": "A project id from List Folder Projects or List My Projects.",
  }, {
    "key": "taskId",
    "label": "Task ID",
    "type": "string",
    "required": true,
    "hint": "A task id from List Tasks.",
  }, {
    "key": "startDate",
    "label": "Start date",
    "type": "string",
    "required": true,
    "hint": "YYYY-MM-DD.",
  }, {
    "key": "startTime",
    "label": "Start time",
    "type": "string",
    "hint": "HH:mm.",
  }, {
    "key": "timezone",
    "label": "Timezone",
    "type": "string",
    "hint": "IANA name, e.g. America/Toronto.",
  }, {
    "key": "endDate",
    "label": "End date",
    "type": "string",
    "hint": "YYYY-MM-DD.",
  }, {
    "key": "endTime",
    "label": "End time",
    "type": "string",
    "hint": "HH:mm.",
  }],
  output: [
    {
      "key": "item",
      "type": "object",
      "label": "The resource Taskade returned",
    },
  ],

  async execute(input, ctx) {
    const res = await new TaskadeClient(ctx).request<Record<string, unknown>>(
      "PUT",
      `/projects/${seg(input.projectId)}/tasks/${seg(input.taskId)}/date`,
      {
        body: {
          start: compact({
            date: input.startDate,
            time: input.startTime,
            timezone: input.timezone,
          }),
          ...(input.endDate
            ? {
              end: compact({ date: input.endDate, time: input.endTime, timezone: input.timezone }),
            }
            : {}),
        },
      },
    );
    return { item: res.item ?? null };
  },
};

export default taskDateSet;
