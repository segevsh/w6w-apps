import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient, csv } from "../lib/client.ts";
import { BODY_FORMAT_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/pages` — verified against Confluence Cloud's REST API v2
 * OpenAPI document (`getPages`).
 */
const action: ActionDefinition = {
  key: "page-list",
  type: "read",
  resource: "page",
  title: "List pages",
  description: "List pages, optionally filtered by space, title or status.",
  params: [
    ...LIST_PARAMS,
    {
      key: "spaceId",
      label: "Space IDs",
      type: "string",
      default: "",
      hint: "Comma-separated numeric space IDs. Use List spaces to find them.",
    },
    { key: "title", label: "Title", type: "string", default: "" },
    {
      key: "status",
      label: "Statuses",
      type: "multiselect",
      default: [],
      options: [
        { value: "current", label: "Current" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
        { value: "trashed", label: "Trashed" },
        { value: "deleted", label: "Deleted" },
      ],
      hint: "Confluence defaults to current and archived.",
    },
    {
      key: "sort",
      label: "Sort By",
      type: "select",
      default: "",
      options: [
        { value: "id", label: "ID" },
        { value: "-id", label: "ID (descending)" },
        { value: "title", label: "Title" },
        { value: "-title", label: "Title (descending)" },
        { value: "created-date", label: "Created" },
        { value: "-created-date", label: "Created (newest first)" },
        { value: "modified-date", label: "Modified" },
        { value: "-modified-date", label: "Modified (newest first)" },
      ],
    },
    BODY_FORMAT_PARAM,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new ConfluenceClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      "space-id": csv(p.spaceId),
      title: (p.title as string) || undefined,
      status: Array.isArray(p.status) && p.status.length ? p.status : undefined,
      sort: (p.sort as string) || undefined,
      "body-format": (p.bodyFormat as string) || undefined,
    };

    ctx.log("info", "listing Confluence pages", { returnAll, limit });

    return await client.requestAll("/pages", { query }, returnAll ? Infinity : limit);
  },
};

export default action;
