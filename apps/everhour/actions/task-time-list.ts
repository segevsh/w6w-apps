import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `GET /tasks/{taskId}/time` — List the time records of one task.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  taskId: string;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
}

const taskTimeList: ActionDefinition<Input> = {
  key: "task-time-list",
  type: "search",
  resource: "time-record",
  title: "List Task Time Records",
  description: "List the time records of one task.",
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Everhour task id, e.g. `ev:3000010034` (or `{platform}:{id}`).",
    },
    { key: "from", label: "From", type: "date", hint: "Start date, YYYY-MM-DD." },
    { key: "to", label: "To", type: "date", hint: "End date, YYYY-MM-DD." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Max records per page; the vendor maximum is 50000.",
    },
    { key: "page", label: "Page", type: "number", hint: "Results page, starting at 1." },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).many(`/tasks/${encodeId(input.taskId)}/time`, {
      query: { "from": input.from, "to": input.to, "page": input.page, "limit": input.limit },
    });
  },
};

export default taskTimeList;
