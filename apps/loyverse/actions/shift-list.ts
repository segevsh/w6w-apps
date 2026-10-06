import { dateRangeParams, idsParam, listAction, paginationParams } from "../lib/factory.ts";

/** `GET /v1.0/shifts` */
export default listAction({
  key: "shift-list",
  title: "List Shifts",
  description: "List cash-register shifts, newest first.",
  resource: "shift",
  path: "/shifts",
  listKey: "shifts",
  paginated: true,
  listQuery: { storeIds: "store_ids" },
  query: {
    createdAtMin: "created_at_min",
    createdAtMax: "created_at_max",
    limit: "limit",
    cursor: "cursor",
  },
  params: [idsParam("storeIds", "Store ids"), ...dateRangeParams, ...paginationParams],
});
