import type { ActionDefinition } from "@w6w/types";
import { compact, Document360Client } from "../lib/client.ts";
import {
  categoryIdParam,
  contentTypeOptions,
  projectIdParam,
  workspaceIdParam,
} from "../lib/params.ts";

/** Create an article in draft status. Publish it with Article: Publish. */
interface Input {
  projectId?: string;
  workspaceId: string;
  categoryId: string;
  title: string;
  content?: string;
  contentType?: string;
  slug?: string;
  order?: number;
}

const articleCreate: ActionDefinition<Input> = {
  key: "article-create",
  type: "perform",
  resource: "article",
  title: "Create Article",
  description: "Create an article in draft status. Publish it with Article: Publish.",
  idempotent: false,
  params: [
    projectIdParam,
    workspaceIdParam,
    { ...categoryIdParam, hint: "The category (or page category) the article goes in." },
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "content",
      label: "Content",
      type: "text",
      hint: "In the chosen content type (Markdown by default).",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "select",
      options: contentTypeOptions,
      hint: "Defaults to Markdown.",
    },
    { key: "slug", label: "Slug", type: "string", hint: "Generated from the title when empty." },
    {
      key: "order",
      label: "Position",
      type: "number",
      hint: "0-based position among sibling articles.",
      validation: { min: 0, integer: true },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Article ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Always draft on creation" },
    { key: "version_number", type: "number", label: "Version number" },
  ],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data("POST", c.projectPath(input.projectId, "/articles"), {
      body: compact({
        title: input.title,
        workspace_id: input.workspaceId,
        category_id: input.categoryId,
        content: input.content,
        content_type: input.contentType,
        slug: input.slug,
        order: input.order,
      }),
    });
  },
};

export default articleCreate;
