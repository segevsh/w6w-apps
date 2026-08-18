import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient, csv } from "../lib/client.ts";
import { BODY_FORMAT_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/blogposts` — verified against Confluence Cloud's REST API
 * v2 OpenAPI document (`getBlogPosts`).
 */
const action: ActionDefinition = {
  key: "blogpost-list",
  type: "read",
  resource: "blogpost",
  title: "List blog posts",
  description: "List blog posts, optionally filtered by space, title or status.",
  params: [
    ...LIST_PARAMS,
    {
      key: "spaceId",
      label: "Space IDs",
      type: "string",
      default: "",
      hint: "Comma-separated numeric space IDs.",
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
    },
    BODY_FORMAT_PARAM,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new ConfluenceClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Confluence blog posts", { returnAll, limit });

    return await client.requestAll(
      "/blogposts",
      {
        query: {
          "space-id": csv(p.spaceId),
          title: (p.title as string) || undefined,
          status: Array.isArray(p.status) && p.status.length ? p.status : undefined,
          "body-format": (p.bodyFormat as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
