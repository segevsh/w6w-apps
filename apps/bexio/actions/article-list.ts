import type { ActionDefinition } from "@w6w/types";
import { BexioClient, listQuery } from "../lib/client.ts";

interface Input {
  orderBy?: "id" | "intern_name";
  descending?: boolean;
  limit?: number;
  offset?: number;
}

const articleList: ActionDefinition<Input> = {
  key: "article-list",
  type: "read",
  resource: "article",
  title: "List Articles",
  description: "Fetch a page of articles (items / products).",
  params: [
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "intern_name", label: "Internal name" },
      ],
      default: "id",
    },
    { key: "descending", label: "Descending", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 2000." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "intern_name", type: "string", label: "Internal name" },
    { key: "sale_price", type: "string", label: "Sale price" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).list("/2.0/article", listQuery(input));
  },
};

export default articleList;
