import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-or-updated-customer",
  title: "New or Updated Customer",
  description:
    "The run gets each customer that is new or has been edited since the last check, polled from the existing `customer-list` action sorted by `updatedAt` descending (`sort=-updatedAt`).",
  action,
  input: () => ({ sort: "-updatedAt", page: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id}:${
      (item as { attributes?: { updatedAt?: unknown } }).attributes?.updatedAt
    }`,
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
      updatedAt: "2026-11-09T11:00:00.000Z",
    },
  },
  maxPages: 1,
});
