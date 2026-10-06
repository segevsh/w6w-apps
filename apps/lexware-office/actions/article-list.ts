import { listAction } from "../lib/factory.ts";

/** `GET /v1/articles` — filters `articleNumber`, `gtin`, `type` (PRODUCT | SERVICE). */
export default listAction({
  key: "article-list",
  title: "List Articles",
  description: "List or filter articles (products and services).",
  resource: "article",
  path: "/articles",
  paged: true,
  query: { articleNumber: "articleNumber", gtin: "gtin", type: "type" },
  params: [
    { key: "articleNumber", label: "Article number", type: "string" },
    { key: "gtin", label: "GTIN", type: "string" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "PRODUCT", label: "Product" }, { value: "SERVICE", label: "Service" }],
    },
  ],
});
