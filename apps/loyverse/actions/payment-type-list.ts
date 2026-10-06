import {
  dateRangeParams,
  idsParam,
  listAction,
  showDeletedParam,
  updatedRangeParams,
} from "../lib/factory.ts";

/** `GET /v1.0/payment_types` — not paginated per the spec. */
export default listAction({
  key: "payment-type-list",
  title: "List Payment Types",
  description: "List payment types (cash, card, …).",
  resource: "payment_type",
  path: "/payment_types",
  listKey: "payment_types",
  paginated: false,
  listQuery: { paymentTypeIds: "payment_type_ids" },
  query: {
    createdAtMin: "created_at_min",
    createdAtMax: "created_at_max",
    updatedAtMin: "updated_at_min",
    updatedAtMax: "updated_at_max",
    showDeleted: "show_deleted",
  },
  params: [
    idsParam("paymentTypeIds", "Payment type ids"),
    ...dateRangeParams,
    ...updatedRangeParams,
    showDeletedParam,
  ],
});
