import { snapshotTrigger } from "../lib/triggers.ts";
import customerList from "../actions/customer-list.ts";

interface Rec {
  id?: number | string;
}

/** Customers are read whole (`GET /customers`, pages of 100, no sort or created filter documented); ids are diffed between checks. */
const newCustomer = snapshotTrigger({
  key: "new-customer",
  title: "New Customer",
  description:
    "The run gets each customer that appears in the company customer list (Get Many Customers; Project Management View only).",
  action: customerList,
  paged: true,
  idOf: (x) => String((x as Rec).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "customer_type", type: "string", label: "Type (individual or business)" },
    { key: "business_name", type: "string", label: "Business name" },
    { key: "contact_first_name", type: "string", label: "Contact first name" },
    { key: "contact_last_name", type: "string", label: "Contact last name" },
    { key: "contact_email", type: "string", label: "Contact email" },
    { key: "code", type: "string", label: "Code" },
  ],
  sample: {
    id: 10,
    type: "customer",
    customer_type: "individual",
    business_name: null,
    contact_first_name: "Ben",
    contact_last_name: "Jackson",
    contact_email: "ben.jackson@example.com",
    code: "NEW00001",
  },
});

export default newCustomer;
