import type { TriggerDefinition } from "@w6w/types";
import { sinceTrigger } from "../lib/triggers.ts";
import customerList from "../actions/customer-list.ts";

const trigger: TriggerDefinition = sinceTrigger({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created customer, with their addresses.",
  action: customerList,
  stampField: "created_at",
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "addresses", type: "array", label: "Addresses" },
    { key: "created_at", type: "string", label: "Created at (UTC)" },
  ],
  sample: {
    id: 1337,
    email: "jdoe@example.com",
    first_name: "John",
    last_name: "Doe",
    addresses: [],
    created_at: "2026-11-10 09:15:00",
  },
});
export default trigger;
