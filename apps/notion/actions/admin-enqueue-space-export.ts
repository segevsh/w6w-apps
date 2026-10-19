import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  spaceId: string;
  exportType: "html" | "markdown";
  onBehalfOfUserEmail: string;
  collectionViewExportType?: "all" | "currentView";
  flattenExportFiletree?: boolean;
  includeComments?: boolean;
  includeContents?: "everything" | "no_files";
  locale?: string;
  teamspaceIds?: unknown[];
  timeZone?: string;
}

/** POST /admin/v1/spaces/{space_id}/exports — enqueue-space-export. */
const action: ActionDefinition<Input> = {
  key: "admin-enqueue-space-export",
  type: "perform",
  resource: "admin",
  title: "Admin: Enqueue a workspace export",
  description: "Admin: Enqueue a workspace export. Requires an Enterprise organization bot token.",
  output: [{ "key": "export_job_id", "type": "string", "label": "Export job id" }, {
    "key": "status",
    "type": "string",
    "label": "Status",
  }],
  idempotent: false,
  params: [
    {
      "key": "spaceId",
      "label": "Space ID",
      "type": "string",
      "required": true,
      "hint": "UUID of the workspace (space) to export.",
    },
    {
      "key": "exportType",
      "label": "Export Type",
      "type": "select",
      "required": true,
      "options": [{ "value": "html", "label": "html" }, {
        "value": "markdown",
        "label": "markdown",
      }],
    },
    {
      "key": "onBehalfOfUserEmail",
      "label": "On Behalf Of User Email",
      "type": "string",
      "required": true,
    },
    {
      "key": "collectionViewExportType",
      "label": "Collection View Export Type",
      "type": "select",
      "options": [{ "value": "all", "label": "all" }, {
        "value": "currentView",
        "label": "currentView",
      }],
    },
    { "key": "flattenExportFiletree", "label": "Flatten Export Filetree", "type": "boolean" },
    { "key": "includeComments", "label": "Include Comments", "type": "boolean" },
    {
      "key": "includeContents",
      "label": "Include Contents",
      "type": "select",
      "options": [{ "value": "everything", "label": "everything" }, {
        "value": "no_files",
        "label": "no_files",
      }],
    },
    { "key": "locale", "label": "Locale", "type": "string" },
    { "key": "teamspaceIds", "label": "Teamspace IDS", "type": "json" },
    { "key": "timeZone", "label": "Time Zone", "type": "string" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/exports`, {
      method: "POST",
      admin: true,
      body: {
        "export_type": input.exportType,
        "on_behalf_of_user_email": input.onBehalfOfUserEmail,
        "collection_view_export_type": input.collectionViewExportType,
        "flatten_export_filetree": input.flattenExportFiletree,
        "include_comments": input.includeComments,
        "include_contents": input.includeContents,
        "locale": input.locale,
        "teamspace_ids": input.teamspaceIds,
        "time_zone": input.timeZone,
      },
    });
  },
};

export default action;
