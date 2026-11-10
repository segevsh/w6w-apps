import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/customer-list.ts";

/** Paddle's `order_by` supports only `id`; `id[DESC]` is its documented default, newest first. */
export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created Paddle customer.",
  action,
  input: () => ({ orderBy: "id[DESC]", perPage: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "active or archived" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "ctm_01h844p3h41s12zs5mn4axja51",
    name: "Ada Lovelace",
    email: "ada@example.com",
    status: "active",
    created_at: "2026-11-09T10:00:00.000Z",
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
