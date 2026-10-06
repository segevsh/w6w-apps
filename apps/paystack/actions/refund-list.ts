import { dateRangeParams, listAction, paginationParams } from "../lib/factory.ts";

/** `GET /refund`. */
export default listAction({
  key: "refund-list",
  title: "List Refunds",
  description: "List refunds, newest first.",
  resource: "refund",
  path: "/refund",
  params: [...dateRangeParams, ...paginationParams],
});
