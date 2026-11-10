import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import taskListMessages from "../actions/task-list-messages.ts";

/** `task.listMessages` with `order=desc` ("newest first", https://open.manus.ai/docs/v2/task.listMessages). */
export default pollFromListAction({
  key: "new-task-event",
  title: "New Task Event",
  description:
    "The run gets each new event on one task: user and assistant messages, status changes and errors.",
  action: taskListMessages as unknown as ActionDefinition,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "The task to watch, from task-create or task-list.",
    },
  ],
  input: (params) => ({
    taskId: (params as { taskId?: string }).taskId,
    order: "desc",
    limit: 100,
  }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "type", type: "string", label: "Event type" },
    { key: "timestamp", type: "number", label: "Time (unix milliseconds)" },
    { key: "assistant_message", type: "object", label: "Assistant message, when the event is one" },
    { key: "status_update", type: "object", label: "Status update, when the event is one" },
  ],
  sample: {
    id: "event-1",
    type: "assistant_message",
    timestamp: 1762765200000,
    assistant_message: { content: "Done." },
  },
  maxPages: 1,
});
