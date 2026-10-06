import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import { categoryIdParam, projectIdParam } from "../lib/params.ts";

/** Permanently delete a category with every version and child article. Irreversible. */
interface Input {
  projectId?: string;
  categoryId: string;
}

const categoryDelete: ActionDefinition<Input> = {
  key: "category-delete",
  type: "perform",
  resource: "category",
  title: "Delete Category",
  description: "Permanently delete a category with every version and child article. Irreversible.",
  idempotent: true,
  params: [projectIdParam, categoryIdParam],
  output: [{ key: "deleted", type: "boolean", label: "True when removed" }, {
    key: "categoryId",
    type: "string",
    label: "The category id",
  }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    await c.data(
      "DELETE",
      c.projectPath(input.projectId, `/categories/${encodeId(input.categoryId)}`),
    );
    return { deleted: true, categoryId: input.categoryId };
  },
};

export default categoryDelete;
