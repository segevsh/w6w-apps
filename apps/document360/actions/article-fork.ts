import type { ActionDefinition } from "@w6w/types";
import { compact, Document360Client, encodeId } from "../lib/client.ts";
import { articleIdParam, langCodeParam, projectIdParam } from "../lib/params.ts";

/** Create a new draft version copied from an existing one (the published version by default), so edits do not touch the live article. */
interface Input {
  projectId?: string;
  articleId: string;
  langCode?: string;
  versionNumber?: number;
}

const articleFork: ActionDefinition<Input> = {
  key: "article-fork",
  type: "perform",
  resource: "article",
  title: "Fork Article Version",
  description:
    "Create a new draft version copied from an existing one (the published version by default), so edits do not touch the live article.",
  idempotent: false,
  params: [projectIdParam, articleIdParam, langCodeParam, {
    key: "versionNumber",
    label: "Version to fork",
    type: "number",
    validation: { min: 1, integer: true },
    hint: "Defaults to the published version.",
  }],
  output: [{ key: "id", type: "string", label: "Article ID" }, {
    key: "version_number",
    type: "number",
    label: "The new draft version number",
  }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data(
      "POST",
      c.projectPath(input.projectId, `/articles/${encodeId(input.articleId)}/fork`),
      {
        query: { lang_code: input.langCode },
        body: compact({ version_number: input.versionNumber }),
      },
    );
  },
};

export default articleFork;
