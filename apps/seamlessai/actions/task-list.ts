import type { ActionDefinition } from "@w6w/types";
import { compact, SeamlessClient, toInt } from "../lib/client.ts";

/** `GET /api/client/v2/tasks` — List Tasks. */
interface Input {
  campaignIdentifier?: string;
  status?: string;
  taskType?: string;
  limit?: number;
  offset?: number;
  sortColumn?: string;
  sortOrder?: string;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description: "List engagement tasks, filtered by campaign, status or type.",
  params: [
    { key: "campaignIdentifier", label: "Campaign identifier", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "DRAFT", label: "DRAFT" },
        { value: "TODO", label: "TODO" },
        { value: "QUEUED", label: "QUEUED" },
        { value: "SCHEDULED", label: "SCHEDULED" },
        { value: "STARTED", label: "STARTED" },
        { value: "RETRYING", label: "RETRYING" },
        { value: "PAUSED", label: "PAUSED" },
        { value: "COMPLETED", label: "COMPLETED" },
        { value: "PASTDUE", label: "PASTDUE" },
        { value: "ARCHIVED", label: "ARCHIVED" },
        { value: "ERROR", label: "ERROR" },
        { value: "CANCELED", label: "CANCELED" },
        { value: "SKIPPED", label: "SKIPPED" },
        { value: "DUE_TODAY", label: "DUE_TODAY" },
        { value: "DELETED", label: "DELETED" },
      ],
    },
    {
      key: "taskType",
      label: "Task type",
      type: "select",
      options: [
        { value: "email", label: "email" },
        { value: "auto-email", label: "auto-email" },
        { value: "manual-email", label: "manual-email" },
        { value: "bulkEmail", label: "bulkEmail" },
        { value: "call", label: "call" },
        { value: "linkedIn", label: "linkedIn" },
        { value: "linkedin-message", label: "linkedin-message" },
        { value: "linkedin-connect-request", label: "linkedin-connect-request" },
        { value: "custom", label: "custom" },
        { value: "default", label: "default" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Maximum results to return.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Number of results to skip.",
    },
    { key: "sortColumn", label: "Sort column", type: "string" },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "asc", label: "asc" }, { value: "desc", label: "desc" }],
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/tasks", {
      query: compact({
        campaignIdentifier: input.campaignIdentifier,
        status: input.status,
        taskType: input.taskType,
        limit: toInt(input.limit, "Limit"),
        offset: toInt(input.offset, "Offset"),
        sortColumn: input.sortColumn,
        sortOrder: input.sortOrder,
      }) as Record<string, string | number | boolean>,
    });
  },
};

export default taskList;
