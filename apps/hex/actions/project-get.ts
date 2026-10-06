import type { ActionDefinition } from "@w6w/types";
import { encodeId, HexClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/** `GET /v1/projects/{projectId}` — metadata for one project (title, owner, status, analytics). */
interface Input {
  projectId: string;
  includeSharing?: boolean;
  includeUnlisted?: boolean;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project's metadata: title, owner, status, categories and view analytics.",
  params: [
    projectIdParam,
    {
      key: "includeSharing",
      label: "Include sharing",
      type: "boolean",
      hint: "Add sharing metadata to the response.",
    },
    {
      key: "includeUnlisted",
      label: "Include unlisted",
      type: "boolean",
      hint: "Unlisted projects are hidden unless this is set.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "PROJECT or COMPONENT" },
    { key: "owner", type: "object", label: "Owner: { email }" },
    { key: "status", type: "object", label: "Status: { name }" },
    { key: "lastPublishedAt", type: "string", label: "Last published" },
  ],

  execute(input, ctx) {
    return new HexClient(ctx).json(`/projects/${encodeId(input.projectId)}`, {
      query: { includeSharing: input.includeSharing, includeUnlisted: input.includeUnlisted },
    });
  },
};

export default projectGet;
