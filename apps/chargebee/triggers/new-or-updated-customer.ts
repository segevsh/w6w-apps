import type { ActionDefinition } from "@w6w/types";
import { chargebeeTrigger } from "../lib/triggers.ts";
import listCustomers from "../actions/list-customers.ts";

export default chargebeeTrigger({
  key: "new-or-updated-customer",
  title: "New or Updated Customer",
  description: "The run gets each customer when it is created and each time it is updated.",
  action: listCustomers as ActionDefinition,
  wrapper: "customer",
  sortAttribute: "updated_at",
  stamp: "updated_at",
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
    { key: "updated_at", type: "number", label: "Updated at (Unix seconds)" },
  ],
  sample: {
    id: "cust_1",
    email: "buyer@example.com",
    first_name: "Sample",
    last_name: "Buyer",
    created_at: 1762689600,
    updated_at: 1762689600,
  },
});
