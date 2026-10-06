import type { ActionDefinition } from "@w6w/types";
import { Document360Client, encodeId } from "../lib/client.ts";
import { articleIdParam, langCodeParam, projectIdParam } from "../lib/params.ts";

/** Read an article's SEO metadata, visibility flags, tags, related articles and custom-field values. */
interface Input {
  projectId?: string;
  articleId: string;
  langCode?: string;
}

const articleSettingsGet: ActionDefinition<Input> = {
  key: "article-settings-get",
  type: "read",
  resource: "article",
  title: "Get Article Settings",
  description:
    "Read an article's SEO metadata, visibility flags, tags, related articles and custom-field values.",
  params: [projectIdParam, articleIdParam, langCodeParam],
  output: [{ key: "slug", type: "string", label: "Slug" }, {
    key: "seo_title",
    type: "string",
    label: "SEO title",
  }, { key: "description", type: "string", label: "Description" }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data(
      "GET",
      c.projectPath(input.projectId, `/articles/${encodeId(input.articleId)}/settings`),
      {
        query: { lang_code: input.langCode },
      },
    );
  },
};

export default articleSettingsGet;
