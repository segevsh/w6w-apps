import {
  dateRangeParams,
  idsParam,
  listAction,
  showDeletedParam,
  updatedRangeParams,
} from "../lib/factory.ts";

/** `GET /v1.0/stores` — not paginated per the spec; returns every store. */
export default listAction({
  key: "store-list",
  title: "List Stores",
  description: "List the account's stores.",
  resource: "store",
  path: "/stores",
  listKey: "stores",
  paginated: false,
  listQuery: { storeIds: "store_ids" },
  query: {
    createdAtMin: "created_at_min",
    createdAtMax: "created_at_max",
    updatedAtMin: "updated_at_min",
    updatedAtMax: "updated_at_max",
    showDeleted: "show_deleted",
  },
  params: [
    idsParam("storeIds", "Store ids"),
    ...dateRangeParams,
    ...updatedRangeParams,
    showDeletedParam,
  ],
});
