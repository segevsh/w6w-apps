import { dateFilter, eventFilter, listAction } from "../lib/rows.ts";

export default listAction({
  key: "returns-list",
  title: "List returns",
  resource: "returns",
  whereType: "ReturnWhereInput",
  fields: "id ticketId returnedAt reason order { id purchasedAt } ticket { id total }",
  filters: [eventFilter, dateFilter("returnedAfter", "returnedAt", "Returned on or after")],
});
