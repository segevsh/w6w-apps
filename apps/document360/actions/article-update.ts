import type { ActionDefinition } from "@w6w/types";
import { compact, Document360Client, encodeId } from "../lib/client.ts";
import {
  articleIdParam,
  langCodeParam,
  projectIdParam,
  translationOptionOptions,
} from "../lib/params.ts";

/** Partially update an article: only the fields you set change. Also moves it (categoryId) or reorders it (order). */
interface Input {
  projectId?: string;
  articleId: string;
  langCode?: string;
  title?: string;
  content?: string;
  categoryId?: string;
  hidden?: boolean;
  versionNumber?: number;
  translationOption?: string;
  order?: number;
  autoFork?: boolean;
}

const articleUpdate: ActionDefinition<Input> = {
  key: "article-update",
  type: "perform",
  resource: "article",
  title: "Update Article",
  description:
    "Partially update an article: only the fields you set change. Also moves it (categoryId) or reorders it (order).",
  idempotent: true,
  params: [
    projectIdParam,
    articleIdParam,
    langCodeParam,
    { key: "title", label: "Title", type: "string" },
    { key: "content", label: "Content", type: "text" },
    {
      key: "categoryId",
      label: "Move to category",
      type: "string",
      hint: "Category id to move the article into.",
    },
    { key: "hidden", label: "Hidden", type: "boolean" },
    {
      key: "versionNumber",
      label: "Version number",
      type: "number",
      validation: { min: 1, integer: true },
      hint: "The version to update. Defaults to the latest.",
    },
    {
      key: "translationOption",
      label: "Translation status",
      type: "select",
      options: translationOptionOptions,
    },
    { key: "order", label: "Position", type: "number", validation: { min: 0, integer: true } },
    {
      key: "autoFork",
      label: "Auto-fork",
      type: "boolean",
      hint: "If the version is published, fork a new draft and edit that instead of failing.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Article ID" }, {
    key: "title",
    type: "string",
    label: "Title",
  }, { key: "version_number", type: "number", label: "Version number" }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data(
      "PATCH",
      c.projectPath(input.projectId, `/articles/${encodeId(input.articleId)}`),
      {
        query: { lang_code: input.langCode },
        body: {
          ...compact({
            title: input.title,
            content: input.content,
            category_id: input.categoryId,
            version_number: input.versionNumber,
            translation_option: input.translationOption,
            order: input.order,
          }),
          ...(input.hidden === undefined ? {} : { hidden: input.hidden }),
          ...(input.autoFork === undefined ? {} : { auto_fork: input.autoFork }),
        },
      },
    );
  },
};

export default articleUpdate;
