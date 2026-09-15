import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  articleId: number;
}

const articleGet: ActionDefinition<Input> = {
  key: "article-get",
  type: "read",
  resource: "article",
  title: "Get Article",
  description: "Fetch a single article (item / product) by ID.",
  params: [
    { key: "articleId", label: "Article ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "intern_name", type: "string", label: "Internal name" },
    { key: "sale_price", type: "string", label: "Sale price" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).get(`/2.0/article/${encodeURIComponent(input.articleId)}`);
  },
};

export default articleGet;
