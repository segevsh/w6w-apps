import type { ActionDefinition } from "@w6w/types";
import { compact, Document360Client, encodeId } from "../lib/client.ts";
import { articleIdParam, langCodeParam, projectIdParam } from "../lib/params.ts";

/** Restore an archived article language version so it can be edited again. */
interface Input {
  projectId?: string;
  articleId: string;
  langCode?: string;
}

const articleUnarchive: ActionDefinition<Input> = {
  key: "article-unarchive",
  type: "perform",
  resource: "article",
  title: "Restore Archived Article",
  description: "Restore an archived article language version so it can be edited again.",
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
      c.projectPath(input.projectId, `/articles/${encodeId(input.articleId)}/unarchive`),
      {
        body: compact({ lang_code: input.langCode }),
      },
    );
  },
};

export default articleUnarchive;
