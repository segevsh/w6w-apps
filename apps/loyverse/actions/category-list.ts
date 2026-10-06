import { idsParam, listAction, paginationParams, showDeletedParam } from "../lib/factory.ts";

/** `GET /v1.0/categories` — the ids filter is spelled `categories_ids` by the vendor. */
export default listAction({
  key: "category-list",
  title: "List Categories",
  description: "List item categories, newest first.",
  resource: "category",
  path: "/categories",
  listKey: "categories",
  paginated: true,
  listQuery: { categoryIds: "categories_ids" },
  query: { showDeleted: "show_deleted", limit: "limit", cursor: "cursor" },
  params: [idsParam("categoryIds", "Category ids"), showDeletedParam, ...paginationParams],
});
