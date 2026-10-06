import { getAction } from "../lib/factory.ts";

/** `GET /customer/{code}`. */
export default getAction({
  key: "customer-get",
  title: "Get Customer",
  description:
    "Fetch a customer by code, with their transactions, subscriptions and authorizations.",
  resource: "customer",
  path: "/customer/{id}",
  idLabel: "Customer code",
  idHint: "e.g. CUS_c6wqvwmvwopw4ms",
  output: [
    { key: "customer_code", type: "string", label: "Customer code" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "authorizations", type: "array", label: "Saved authorizations" },
    { key: "subscriptions", type: "array", label: "Subscriptions" },
  ],
});
