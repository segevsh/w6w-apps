import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created customer.",
  action,
  input: () => ({ orderBy: "MetaData.CreateTime DESC", maxResults: 100 }),
  items: (result) =>
    (result as { QueryResponse?: { Customer?: unknown[] } }).QueryResponse?.Customer ?? [],
  idOf: (item) => String((item as { Id?: unknown }).Id ?? ""),
  output: [{ key: "Id", type: "string", label: "Customer ID" }],
  sample: { Id: "42", DisplayName: "Ada" },
  maxPages: 1,
});
