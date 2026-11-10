import action from "../actions/list-customers.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-customer",
  title: "New Customer",
  description:
    "The run gets each newly created Pennylane customer (company or individual), newest first.",
  action,
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "customer_type", type: "string", label: "Type (company or individual)" },
  ],
  sample: { id: 318, name: "Atelier Dupont", customer_type: "company" },
});
