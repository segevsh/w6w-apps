import type { ActionDefinition } from "@w6w/types";
import { compact, Document360Client, encodeId } from "../lib/client.ts";
import { articleIdParam, langCodeParam, projectIdParam } from "../lib/params.ts";

/** Archive an article language version: it becomes read-only and drops out of publish and search surfaces until restored. */
interface Input {
  projectId?: string;
  articleId: string;
  langCode?: string;
}

const articleArchive: ActionDefinition<Input> = {
  key: "article-archive",
  type: "perform",
  resource: "article",
  title: "Archive Article",
  description:
    "Archive an article language version: it becomes read-only and drops out of publish and search surfaces until restored.",
  idempotent: true,
  params: [projectIdParam, articleIdParam, langCodeParam],
  output: [{ key: "is_archived", type: "boolean", label: "Archived state after the call" }, {
    key: "operation_id",
    type: "string",
    label: "Operation id, when the work is asynchronous",
  }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data(
      "POST",
      c.projectPath(input.projectId, `/articles/${encodeId(input.articleId)}/archive`),
      {
        body: compact({ lang_code: input.langCode }),
      },
    );
  },
};

export default articleArchive;
