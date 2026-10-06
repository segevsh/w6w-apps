import type { ActionDefinition } from "@w6w/types";
import { compact, Document360Client, encodeId } from "../lib/client.ts";
import { articleIdParam, projectIdParam, workspaceIdParam } from "../lib/params.ts";

/** Publish a draft version of an article, superseding any previously published version. */
interface Input {
  projectId?: string;
  articleId: string;
  workspaceId: string;
  versionNumber: number;
  message?: string;
}

const articlePublish: ActionDefinition<Input> = {
  key: "article-publish",
  type: "perform",
  resource: "article",
  title: "Publish Article",
  description:
    "Publish a draft version of an article, superseding any previously published version.",
  idempotent: true,
  params: [projectIdParam, articleIdParam, workspaceIdParam, {
    key: "versionNumber",
    label: "Version number",
    type: "number",
    required: true,
    validation: { min: 1, integer: true },
  }, { key: "message", label: "Publish note", type: "string" }],
  output: [{ key: "published", type: "boolean", label: "True when published" }, {
    key: "articleId",
    type: "string",
    label: "The article id",
  }, { key: "versionNumber", type: "number", label: "The version published" }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    await c.data(
      "POST",
      c.projectPath(input.projectId, `/articles/${encodeId(input.articleId)}/publish`),
      {
        body: compact({
          workspace_id: input.workspaceId,
          version_number: input.versionNumber,
          message: input.message,
        }),
      },
    );
    return { published: true, articleId: input.articleId, versionNumber: input.versionNumber };
  },
};

export default articlePublish;
