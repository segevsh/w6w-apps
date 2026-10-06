import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import { articleIdParam, projectIdParam } from "../lib/params.ts";

/** Permanently delete an article and all its versions. Irreversible; consider Article: Archive or Unpublish instead. */
interface Input {
  projectId?: string;
  articleId: string;
}

const articleDelete: ActionDefinition<Input> = {
  key: "article-delete",
  type: "perform",
  resource: "article",
  title: "Delete Article",
  description:
    "Permanently delete an article and all its versions. Irreversible; consider Article: Archive or Unpublish instead.",
  idempotent: true,
  params: [projectIdParam, articleIdParam],
  output: [{ key: "deleted", type: "boolean", label: "True when removed" }, {
    key: "articleId",
    type: "string",
    label: "The article id",
  }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    await c.data(
      "DELETE",
      c.projectPath(input.projectId, `/articles/${encodeId(input.articleId)}`),
    );
    return { deleted: true, articleId: input.articleId };
  },
};

export default articleDelete;
