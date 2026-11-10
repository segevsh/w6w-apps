import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description:
    "The run gets each newly created customer, oldest first, polled from the existing `customer-list` action sorted by `createdAt` descending (`sort=-createdAt`).",
  action,
  input: () => ({ sort: "-createdAt", page: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    {
      key: "attributes",
      type: "object",
      label: "Customer attributes (name, createdAt, updatedAt)",
    },
  ],
  sample: {
    id: "5f0a1b2c3d4e5f6a7b8c9d0e",
    type: "customer",
    attributes: {
      name: "Ada Lovelace",
      createdAt: "2026-11-09T10:00:00.000Z",
      updatedAt: "2026-11-09T10:00:00.000Z",
    },
  },
  maxPages: 1,
});
