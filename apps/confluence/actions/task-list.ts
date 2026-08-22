import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient, csv } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/tasks` — verified against Confluence Cloud's REST API v2
 * OpenAPI document (`getTasks`).
 *
 * Confluence tasks are the inline checkboxes inside page bodies, not a
 * separate tracker — which is exactly why they are worth an action: "what is
 * still unticked across this space" is otherwise unanswerable without reading
 * every page.
 */
const action: ActionDefinition = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List tasks",
  description: "List the inline tasks in pages and blog posts, filtered by status or assignee.",
  params: [
    ...LIST_PARAMS,
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "complete", label: "Complete" },
        { value: "incomplete", label: "Incomplete" },
      ],
    },
    {
      key: "spaceId",
      label: "Space IDs",
      type: "string",
      default: "",
      hint: "Comma-separated numeric space IDs.",
    },
    { key: "pageId", label: "Page IDs", type: "string", default: "", hint: "Comma-separated." },
    {
      key: "assignedTo",
      label: "Assignee Account IDs",
      type: "string",
      default: "",
      hint: "Comma-separated Atlassian account IDs.",
    },
    {
      key: "bodyFormat",
      label: "Body Format",
      type: "select",
      default: "",
      options: [
        { value: "storage", label: "Storage (XHTML)" },
        { value: "atlas_doc_format", label: "Atlassian Document Format" },
        { value: "view", label: "View (rendered HTML)" },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new ConfluenceClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Confluence tasks", { returnAll, limit });

    return await client.requestAll(
      "/tasks",
      {
        query: {
          status: (p.status as string) || undefined,
          "space-id": csv(p.spaceId),
          "page-id": csv(p.pageId),
          "assigned-to": csv(p.assignedTo),
          "body-format": (p.bodyFormat as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
