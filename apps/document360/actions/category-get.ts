import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import { categoryIdParam, projectIdParam } from "../lib/params.ts";

/** Fetch a category's metadata with its nested articles and child categories. */
interface Input {
  projectId?: string;
  categoryId: string;
}

const categoryGet: ActionDefinition<Input> = {
  key: "category-get",
  type: "read",
  resource: "category",
  title: "Get Category",
  description: "Fetch a category's metadata with its nested articles and child categories.",
  params: [projectIdParam, categoryIdParam],
  output: [{ key: "id", type: "string", label: "Category ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "workspace_id", type: "string", label: "Workspace ID" }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data(
      "GET",
      c.projectPath(input.projectId, `/categories/${encodeId(input.categoryId)}`),
    );
  },
};

export default categoryGet;
