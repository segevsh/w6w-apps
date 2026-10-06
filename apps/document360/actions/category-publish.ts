import type { ActionDefinition } from "@w6w/types";
import { compact, Document360Client, encodeId } from "../lib/client.ts";
import { categoryIdParam, langCodeParam, projectIdParam, workspaceIdParam } from "../lib/params.ts";

/** Publish a draft version of a category (page category), making it visible to readers. */
interface Input {
  projectId?: string;
  categoryId: string;
  workspaceId: string;
  versionNumber: number;
  langCode?: string;
  message?: string;
}

const categoryPublish: ActionDefinition<Input> = {
  key: "category-publish",
  type: "perform",
  resource: "category",
  title: "Publish Category",
  description:
    "Publish a draft version of a category (page category), making it visible to readers.",
  idempotent: true,
  params: [
    projectIdParam,
    categoryIdParam,
    workspaceIdParam,
    {
      key: "versionNumber",
      label: "Version number",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
    },
    langCodeParam,
    { key: "message", label: "Publish note", type: "string" },
  ],
  output: [{ key: "published", type: "boolean", label: "True when published" }, {
    key: "categoryId",
    type: "string",
    label: "The category id",
  }, { key: "versionNumber", type: "number", label: "The version published" }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    await c.data(
      "POST",
      c.projectPath(input.projectId, `/categories/${encodeId(input.categoryId)}/publish`),
      {
        query: { lang_code: input.langCode },
        body: compact({
          workspace_id: input.workspaceId,
          version_number: input.versionNumber,
          message: input.message,
        }),
      },
    );
    return { published: true, categoryId: input.categoryId, versionNumber: input.versionNumber };
  },
};

export default categoryPublish;
