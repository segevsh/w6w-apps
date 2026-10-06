import type { ActionDefinition } from "@w6w/types";
import { compact, Document360Client } from "../lib/client.ts";
import {
  categoryTypeOptions,
  contentTypeOptions,
  projectIdParam,
  workspaceIdParam,
} from "../lib/params.ts";

/** Create a category in a workspace: a folder, a page, or an index category, optionally nested under a parent. */
interface Input {
  projectId?: string;
  workspaceId: string;
  name: string;
  parentCategoryId?: string;
  categoryType?: string;
  content?: string;
  contentType?: string;
  slug?: string;
  hidden?: boolean;
  order?: number;
}

const categoryCreate: ActionDefinition<Input> = {
  key: "category-create",
  type: "perform",
  resource: "category",
  title: "Create Category",
  description:
    "Create a category in a workspace: a folder, a page, or an index category, optionally nested under a parent.",
  idempotent: false,
  params: [
    projectIdParam,
    workspaceIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "parentCategoryId",
      label: "Parent category ID",
      type: "string",
      hint: "Empty creates a top-level category.",
    },
    { key: "categoryType", label: "Category type", type: "select", options: categoryTypeOptions },
    { key: "content", label: "Page content", type: "text", hint: "Only for the page type." },
    { key: "contentType", label: "Content type", type: "select", options: contentTypeOptions },
    { key: "slug", label: "Slug", type: "string" },
    { key: "hidden", label: "Hidden", type: "boolean" },
    { key: "order", label: "Position", type: "number", validation: { min: 0, integer: true } },
  ],
  output: [{ key: "id", type: "string", label: "Category ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "parent_category_id", type: "string", label: "Parent category ID" }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data("POST", c.projectPath(input.projectId, "/categories"), {
      body: {
        ...compact({
          name: input.name,
          workspace_id: input.workspaceId,
          parent_category_id: input.parentCategoryId,
          category_type: input.categoryType,
          content: input.content,
          content_type: input.contentType,
          slug: input.slug,
          order: input.order,
        }),
        ...(input.hidden === undefined ? {} : { hidden: input.hidden }),
      },
    });
  },
};

export default categoryCreate;
