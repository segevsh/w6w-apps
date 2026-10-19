import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  jobId: string;
  workspaceId: string;
}

/** GET /admin/v1/analytics/user_activity/reports/{job_id} — get-user-activity-analytics-report. */
const action: ActionDefinition<Input> = {
  key: "admin-get-user-activity-analytics-report",
  type: "read",
  resource: "admin",
  title: "Admin: Get user activity analytics report",
  description:
    "Admin: Get user activity analytics report. Requires an Enterprise organization bot token.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "report_type", "type": "string", "label": "Report type" },
    { "key": "report_version", "type": "number", "label": "Report version" },
    { "key": "workspace_id", "type": "string", "label": "Workspace id" },
    { "key": "start_date", "type": "string", "label": "Start date" },
    { "key": "end_date", "type": "string", "label": "End date" },
    { "key": "time_zone", "type": "string", "label": "Time zone" },
    { "key": "file_format", "type": "string", "label": "File format" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "completed_time", "type": "string", "label": "Completed time" },
    { "key": "file_expires_at", "type": "string", "label": "File expires at" },
    { "key": "row_count", "type": "number", "label": "Row count" },
    { "key": "file_size_bytes", "type": "number", "label": "File size bytes" },
    { "key": "data_as_of", "type": "number", "label": "Data as of" },
    { "key": "download_url", "type": "string", "label": "Download url" },
    { "key": "link_expires_at", "type": "string", "label": "Link expires at" },
  ],
  params: [{
    "key": "jobId",
    "label": "Job ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, { "key": "workspaceId", "label": "Workspace ID", "type": "string", "required": true }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/analytics/user_activity/reports/${pathId(input.jobId)}`, {
      method: "GET",
      admin: true,
      query: {
        "workspace_id": input.workspaceId,
      },
    });
  },
};

export default action;
