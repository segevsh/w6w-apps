import { dateFilter, listAction } from "../lib/rows.ts";

export default listAction({
  key: "events-list",
  title: "List events",
  resource: "events",
  whereType: "EventWhereInput",
  fields: "id name state startDatetime endDatetime updatedAt currency url",
  filters: [dateFilter("startsAfter", "startDatetime", "Starts on or after")],
});
