import { boundedList } from "../lib/triggers.ts";
import customerList from "../actions/customer-list.ts";

export default boundedList({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each customer newly created on the account.",
  action: customerList as never,
  paged: true,
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "number", label: "Created (unix seconds)" },
  ],
  sample: { id: "cust_1", name: "Asha Rao", email: "asha@example.com", created_at: 1700000000 },
});
