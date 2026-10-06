import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /resource-planner/assignments` — List resource-planner assignments, optionally filtered.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  type?: string;
  project?: string;
  task?: string;
  client?: number;
  from?: string;
  to?: string;
}

const assignmentList: ActionDefinition<Input> = {
  key: "assignment-list",
  type: "search",
  resource: "assignment",
  title: "List Assignments",
  description: "List resource-planner assignments, optionally filtered.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "time-off", label: "time-off" }, {
        value: "assignment",
        label: "assignment",
      }],
    },
    { key: "project", label: "Project ID", type: "string" },
    { key: "task", label: "Task ID", type: "string" },
    { key: "client", label: "Client ID", type: "number" },
    { key: "from", label: "From", type: "date", hint: "Assignments starting from this date." },
    { key: "to", label: "To", type: "date", hint: "Assignments ending at this date." },
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
    return new EverhourClient(ctx).many(`/resource-planner/assignments`, {
      query: {
        "type": input.type,
        "project": input.project,
        "task": input.task,
        "client": input.client,
        "from": input.from,
        "to": input.to,
      },
    });
  },
};

export default assignmentList;
