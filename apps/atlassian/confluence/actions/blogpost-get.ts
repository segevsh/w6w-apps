import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";
import { BODY_FORMAT_PARAM } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/blogposts/{id}` — verified against Confluence Cloud's REST
 * API v2 OpenAPI document (`getBlogPostById`).
 */
const action: ActionDefinition = {
  key: "blogpost-get",
  type: "read",
  resource: "blogpost",
  title: "Get a blog post",
  description: "Retrieve one blog post by ID.",
  params: [
    { key: "blogpostId", label: "Blog Post ID", type: "string", required: true, default: "" },
    { ...BODY_FORMAT_PARAM, default: "storage" },
    { key: "version", label: "Version", type: "number", default: null },
    { key: "includeLabels", label: "Include Labels", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "string", label: "Blog post ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "spaceId", type: "string", label: "Space ID" },
    { key: "authorId", type: "string", label: "Author account ID" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "version", type: "object", label: "Version" },
    { key: "body", type: "object", label: "Body" },
    { key: "_links", type: "object", label: "Links" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const blogpostId = String(p.blogpostId ?? "").trim();
    if (!blogpostId) throw new Error("`blogpostId` is required");

    const client = new ConfluenceClient(ctx);
    ctx.log("info", "getting Confluence blog post", { blogpostId });

    return await client.request(`/blogposts/${encodeURIComponent(blogpostId)}`, {
      query: {
        // Defaults to storage — a read that silently omits the body is a
        // surprise, and storage is the format Confluence itself keeps.
        "body-format": (p.bodyFormat as string) || "storage",
        version: typeof p.version === "number" ? p.version : undefined,
        "include-labels": p.includeLabels === true ? "true" : undefined,
      },
    });
  },
};

export default action;
