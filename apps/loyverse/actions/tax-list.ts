import {
  dateRangeParams,
  idsParam,
  listAction,
  showDeletedParam,
  updatedRangeParams,
} from "../lib/factory.ts";

/** `GET /v1.0/taxes` — not paginated per the spec. */
export default listAction({
  key: "tax-list",
  title: "List Taxes",
  description: "List taxes.",
  resource: "tax",
  path: "/taxes",
  listKey: "taxes",
  paginated: false,
  listQuery: { taxIds: "tax_ids" },
  query: {
    createdAtMin: "created_at_min",
    createdAtMax: "created_at_max",
    updatedAtMin: "updated_at_min",
    updatedAtMax: "updated_at_max",
    showDeleted: "show_deleted",
  },
  params: [
    idsParam("taxIds", "Tax ids"),
    ...dateRangeParams,
    ...updatedRangeParams,
    showDeletedParam,
  ],
});
