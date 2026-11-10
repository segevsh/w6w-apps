import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-or-updated-customer",
  title: "New or Updated Customer",
  description: "The run gets each customer that is new or was updated since the last check.",
  action,
  input: () => ({ orderBy: "MetaData.LastUpdatedTime DESC", maxResults: 100 }),
  items: (result) =>
    (result as { QueryResponse?: { Customer?: unknown[] } }).QueryResponse?.Customer ?? [],
  idOf: (item) =>
    `${(item as { Id?: string }).Id}:${
      (item as { MetaData?: { LastUpdatedTime?: string } }).MetaData?.LastUpdatedTime
    }`,
  output: [{ key: "Id", type: "string", label: "Customer ID" }, {
    key: "MetaData",
    type: "object",
    label: "Metadata (CreateTime, LastUpdatedTime)",
  }],
  sample: {
    Id: "42",
    DisplayName: "Ada",
    MetaData: { LastUpdatedTime: "2026-11-09T10:00:00-08:00" },
  },
  maxPages: 1,
});
