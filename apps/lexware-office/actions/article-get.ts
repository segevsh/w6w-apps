import { getAction } from "../lib/factory.ts";

/** `GET /v1/articles/{id}` */
export default getAction({
  key: "article-get",
  title: "Get Article",
  description: "Fetch one article including its price object.",
  resource: "article",
  path: "/articles/{id}",
  idLabel: "Article id",
  output: [
    { key: "id", type: "string", label: "Article id" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "PRODUCT or SERVICE" },
    { key: "price", type: "object", label: "Price (net, gross, leadingPrice, taxRate)" },
    { key: "version", type: "number", label: "Version" },
  ],
});
