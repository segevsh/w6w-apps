import { dateFilter, eventFilter, listAction } from "../lib/rows.ts";

export default listAction({
  key: "orders-list",
  title: "List orders",
  resource: "orders",
  whereType: "OrderWhereInput",
  fields:
    "id purchasedAt quantity salesChannel fullPrice commission diceCommission total event { id name currency }",
  filters: [eventFilter, dateFilter("purchasedAfter", "purchasedAt", "Purchased on or after")],
});
