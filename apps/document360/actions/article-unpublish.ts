import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import { articleIdParam, langCodeParam, projectIdParam, workspaceIdParam } from "../lib/params.ts";

/** Revert a published article version to draft. The content is preserved. */
interface Input {
  projectId?: string;
  articleId: string;
  workspaceId: string;
  versionNumber: number;
  langCode?: string;
}

const articleUnpublish: ActionDefinition<Input> = {
  key: "article-unpublish",
  type: "perform",
  resource: "article",
  title: "Unpublish Article",
  description: "Revert a published article version to draft. The content is preserved.",
  idempotent: true,
  params: [projectIdParam, articleIdParam, workspaceIdParam, {
    key: "versionNumber",
    label: "Version number",
    type: "number",
    required: true,
    validation: { min: 1, integer: true },
  }, langCodeParam],
  output: [{ key: "unpublished", type: "boolean", label: "True when unpublished" }, {
    key: "articleId",
    type: "string",
    label: "The article id",
  }, { key: "versionNumber", type: "number", label: "The version unpublished" }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    await c.data(
      "POST",
      c.projectPath(input.projectId, `/articles/${encodeId(input.articleId)}/unpublish`),
      {
        query: { lang_code: input.langCode },
        body: { workspace_id: input.workspaceId, version_number: input.versionNumber },
      },
    );
    return { unpublished: true, articleId: input.articleId, versionNumber: input.versionNumber };
  },
};

export default articleUnpublish;
