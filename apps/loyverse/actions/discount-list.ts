import {
  dateRangeParams,
  idsParam,
  listAction,
  showDeletedParam,
  updatedRangeParams,
} from "../lib/factory.ts";

/** `GET /v1.0/discounts` — not paginated per the spec. */
export default listAction({
  key: "discount-list",
  title: "List Discounts",
  description: "List discounts.",
  resource: "discount",
  path: "/discounts",
  listKey: "discounts",
  paginated: false,
  listQuery: { discountIds: "discount_ids" },
  query: {
    createdAtMin: "created_at_min",
    createdAtMax: "created_at_max",
    updatedAtMin: "updated_at_min",
    updatedAtMax: "updated_at_max",
    showDeleted: "show_deleted",
  },
  params: [
    idsParam("discountIds", "Discount ids"),
    ...dateRangeParams,
    ...updatedRangeParams,
    showDeletedParam,
  ],
});
