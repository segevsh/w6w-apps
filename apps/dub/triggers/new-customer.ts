import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created Dub customer.",
  action,
  input: (params) => ({
    ...params,
    sortBy: "createdAt",
    sortOrder: "desc",
    pageSize: 100,
    startingAfter: undefined,
    endingBefore: undefined,
  }),
  items: (result) => (result as { customers?: unknown[] }).customers ?? [],
  idOf: (item) => String((item as { id: string }).id),
  params: action.params,
  output: [{ key: "id", type: "string", label: "Customer ID" }],
  sample: { id: "cus_123", email: "customer@example.com", createdAt: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
