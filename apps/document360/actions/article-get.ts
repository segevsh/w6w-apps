import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import { articleIdParam, langCodeParam, projectIdParam } from "../lib/params.ts";

/** Fetch an article's latest version (draft or published) with raw content and rendered HTML. */
interface Input {
  projectId?: string;
  articleId: string;
  langCode?: string;
  contentMode?: string;
  published?: boolean;
}

const articleGet: ActionDefinition<Input> = {
  key: "article-get",
  type: "read",
  resource: "article",
  title: "Get Article",
  description:
    "Fetch an article's latest version (draft or published) with raw content and rendered HTML.",
  params: [projectIdParam, articleIdParam, langCodeParam, {
    key: "contentMode",
    label: "Content mode",
    type: "select",
    default: "raw",
    options: [{ value: "raw", label: "Raw" }, { value: "display", label: "Display" }],
  }, {
    key: "published",
    label: "Published version",
    type: "boolean",
    default: false,
    hint: "True returns the latest published version instead of the latest version.",
  }],
  output: [
    { key: "id", type: "string", label: "Article ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "content", type: "string", label: "Content" },
    { key: "html_content", type: "string", label: "Rendered HTML" },
    { key: "status", type: "string", label: "draft, published or unpublished" },
    { key: "version_number", type: "number", label: "Version number" },
  ],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data(
      "GET",
      c.projectPath(input.projectId, `/articles/${encodeId(input.articleId)}`),
      {
        query: {
          lang_code: input.langCode,
          content_mode: input.contentMode,
          published: input.published ? true : undefined,
        },
      },
    );
  },
};

export default articleGet;
