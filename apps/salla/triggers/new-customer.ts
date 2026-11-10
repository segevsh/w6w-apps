import { pagedSnapshotTrigger } from "../lib/triggers.ts";
import customerList from "../actions/customer-list.ts";

/**
 * `customer-list` documents no sort order and no created-since filter
 * (https://docs.salla.dev/pagination.md and the endpoint page), so each check reads the whole list
 * (read up to 50 pages (3000 customers)) and diffs ids.
 */
export default pagedSnapshotTrigger({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each customer newly registered in the store.",
  action: customerList,
  maxPages: 50,
  minIntervalMs: 900000,
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: 1301, first_name: "Ada", last_name: "Lovelace", email: "ada@example.test" },
});
