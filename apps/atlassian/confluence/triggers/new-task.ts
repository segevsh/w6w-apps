import type { TriggerDefinition } from "@w6w/types";
import { pollTasks } from "../lib/tasks.ts";

/**
 * Since-filter trigger over `GET /wiki/api/v2/tasks`: `created-at-from` (epoch ms, inclusive) is the
 * last check minus an overlap, and the task's `createdAt` is compared with the seed floor, so tasks
 * that existed before the first check never fire. The endpoint documents no sort, so the window is
 * drained by cursor across checks (https://dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json,
 * `getTasks`, verified 2026-11-10).
 */
const trigger: TriggerDefinition = {
  key: "new-task",
  title: "New Task",
  description: "The run gets each inline task newly created in a Confluence page or blog post.",
  params: [
    {
      key: "spaceId",
      label: "Space IDs",
      type: "string",
      default: "",
      hint: "Comma-separated numeric space IDs. Leave empty for every space.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "localId", type: "string", label: "Local ID" },
    { key: "spaceId", type: "string", label: "Space ID" },
    { key: "pageId", type: "string", label: "Page ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdBy", type: "string", label: "Creator account ID" },
    { key: "assignedTo", type: "string", label: "Assignee account ID" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "task-101",
    localId: "local-1",
    spaceId: "space-1",
    pageId: "page-101",
    status: "incomplete",
    createdBy: "acct-1",
    assignedTo: "acct-2",
    createdAt: "2026-11-09T09:00:00.000Z",
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return pollTasks(state, (params ?? {}) as Record<string, unknown>, ctx);
  },
};

export default trigger;
