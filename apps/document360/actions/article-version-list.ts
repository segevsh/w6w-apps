import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import { articleIdParam, langCodeParam, listOutput, projectIdParam } from "../lib/params.ts";

/** List every version of an article (draft and published) with its number, status and author. */
interface Input {
  projectId?: string;
  articleId: string;
  langCode?: string;
}

const articleVersionList: ActionDefinition<Input> = {
  key: "article-version-list",
  type: "read",
  resource: "article",
  title: "List Article Versions",
  description:
    "List every version of an article (draft and published) with its number, status and author.",
  params: [projectIdParam, articleIdParam, langCodeParam],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.list(
      c.projectPath(input.projectId, `/articles/${encodeId(input.articleId)}/versions`),
      { lang_code: input.langCode },
    );
  },
};

export default articleVersionList;
