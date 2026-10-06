import {
  dateRangeParams,
  idsParam,
  listAction,
  paginationParams,
  showDeletedParam,
  updatedRangeParams,
} from "../lib/factory.ts";

/** `GET /v1.0/items` — the ids filter is spelled `items_ids` by the vendor. */
export default listAction({
  key: "item-list",
  title: "List Items",
  description: "List items with their variants, newest first.",
  resource: "item",
  path: "/items",
  listKey: "items",
  paginated: true,
  listQuery: { itemIds: "items_ids" },
  query: {
    createdAtMin: "created_at_min",
    createdAtMax: "created_at_max",
    updatedAtMin: "updated_at_min",
    updatedAtMax: "updated_at_max",
    showDeleted: "show_deleted",
    limit: "limit",
    cursor: "cursor",
  },
  params: [
    idsParam("itemIds", "Item ids"),
    ...dateRangeParams,
    ...updatedRangeParams,
    showDeletedParam,
    ...paginationParams,
  ],
});
