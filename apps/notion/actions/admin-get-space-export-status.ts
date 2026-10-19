import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  exportJobId: string;
  spaceId: string;
}

/** GET /admin/v1/spaces/{space_id}/exports/{export_job_id} — get-space-export-status. */
const action: ActionDefinition<Input> = {
  key: "admin-get-space-export-status",
  type: "read",
  resource: "admin",
  title: "Admin: Get workspace export status",
  description: "Admin: Get workspace export status. Requires an Enterprise organization bot token.",
  output: [
    { "key": "created_time", "type": "number", "label": "Created time" },
    { "key": "export_format", "type": "string", "label": "Export format" },
    { "key": "export_job_id", "type": "string", "label": "Export job id" },
    { "key": "export_type", "type": "string", "label": "Export type" },
    { "key": "last_edited_time", "type": "number", "label": "Last edited time" },
    { "key": "pages_exported", "type": "number", "label": "Pages exported" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "download_urls", "type": "array", "label": "Download urls" },
    { "key": "error_message", "type": "string", "label": "Error message" },
    { "key": "error_type", "type": "string", "label": "Error type" },
    { "key": "url_expires_time", "type": "number", "label": "Url expires time" },
  ],
  params: [{
    "key": "exportJobId",
    "label": "Export Job ID",
    "type": "string",
    "required": true,
    "hint": "Identifier of the export job, as returned by the enqueue endpoint.",
  }, {
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "UUID of the workspace (space) the export belongs to.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/exports/${pathId(input.exportJobId)}`, {
      method: "GET",
      admin: true,
    });
  },
};

export default action;
