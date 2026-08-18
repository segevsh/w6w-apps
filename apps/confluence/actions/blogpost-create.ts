import type { ActionDefinition } from "@w6w/types";
import { compact, ConfluenceClient, contentBody } from "../lib/client.ts";

/**
 * `POST /wiki/api/v2/blogposts` — verified against Confluence Cloud's REST API
 * v2 OpenAPI document (`createBlogPost`; body requires `spaceId`, and `title`
 * is required whenever the status is not `draft`).
 */
const action: ActionDefinition = {
  key: "blogpost-create",
  type: "perform",
  resource: "blogpost",
  title: "Create a blog post",
  description: "Publish a blog post in a space.",
  idempotent: false,
  params: [
    { key: "spaceId", label: "Space ID", type: "string", required: true, default: "" },
    {
      key: "title",
      label: "Title",
      type: "string",
      default: "",
      hint: "Required unless the status is draft.",
    },
    { key: "body", label: "Body", type: "text", default: "" },
    {
      key: "representation",
      label: "Body Format",
      type: "select",
      default: "storage",
      options: [
        { value: "storage", label: "Storage (XHTML)" },
        { value: "wiki", label: "Wiki markup" },
        { value: "atlas_doc_format", label: "Atlassian Document Format" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "current",
      options: [
        { value: "current", label: "Published" },
        { value: "draft", label: "Draft" },
      ],
    },
    {
      key: "createdAt",
      label: "Publish Date",
      type: "datetime",
      default: "",
      hint: "Backdate the post. Confluence uses now when blank.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Blog post ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "spaceId", type: "string", label: "Space ID" },
    { key: "version", type: "object", label: "Version" },
    { key: "_links", type: "object", label: "Links" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const spaceId = String(p.spaceId ?? "").trim();
    const title = String(p.title ?? "").trim();
    const status = (p.status as string) || "current";
    if (!spaceId) throw new Error("`spaceId` is required");
    if (!title && status !== "draft") {
      throw new Error("`title` is required unless the blog post is a draft");
    }

    const body = compact({
      spaceId,
      status,
      title: title || undefined,
      body: contentBody(p.body, (p.representation as string) || "storage"),
      createdAt: p.createdAt,
    });

    const client = new ConfluenceClient(ctx);
    ctx.log("info", "creating Confluence blog post", { spaceId, title });

    return await client.request("/blogposts", { method: "POST", body });
  },
};

export default action;
