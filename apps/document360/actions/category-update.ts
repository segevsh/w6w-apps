import type { ActionDefinition } from "@w6w/types";
import { compact, Document360Client, encodeId } from "../lib/client.ts";
import { categoryIdParam, projectIdParam } from "../lib/params.ts";

/** Partially update a category: rename, reorder, move under another parent, hide, or change its icon. */
interface Input {
  projectId?: string;
  categoryId: string;
  name?: string;
  order?: number;
  parentCategoryId?: string;
  hidden?: boolean;
  icon?: string;
}

const categoryUpdate: ActionDefinition<Input> = {
  key: "category-update",
  type: "perform",
  resource: "category",
  title: "Update Category",
  description:
    "Partially update a category: rename, reorder, move under another parent, hide, or change its icon.",
  idempotent: true,
  params: [
    projectIdParam,
    categoryIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "order", label: "Position", type: "number", validation: { min: 0, integer: true } },
    { key: "parentCategoryId", label: "Move under category", type: "string" },
    { key: "hidden", label: "Hidden", type: "boolean" },
    { key: "icon", label: "Icon", type: "string" },
  ],
  output: [{ key: "id", type: "string", label: "Category ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data(
      "PATCH",
      c.projectPath(input.projectId, `/categories/${encodeId(input.categoryId)}`),
      {
        body: {
          ...compact({
            name: input.name,
            order: input.order,
            parent_category_id: input.parentCategoryId,
            icon: input.icon,
          }),
          ...(input.hidden === undefined ? {} : { hidden: input.hidden }),
        },
      },
    );
  },
};

export default categoryUpdate;
