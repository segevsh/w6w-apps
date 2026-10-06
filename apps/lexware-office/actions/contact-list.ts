import { listAction, yesNo } from "../lib/factory.ts";

/** `GET /v1/contacts` — filters AND together; `email`/`name` need at least 3 characters. */
export default listAction({
  key: "contact-list",
  title: "List Contacts",
  description: "List or search customers and vendors. Filters are combined with AND.",
  resource: "contact",
  path: "/contacts",
  paged: true,
  query: { email: "email", name: "name", number: "number", customer: "customer", vendor: "vendor" },
  params: [
    {
      key: "email",
      label: "Email contains",
      type: "string",
      validation: { minLength: 3 },
      hint: "Case-insensitive substring over every email address; `_` and `%` are wildcards. " +
        "At least 3 characters.",
    },
    {
      key: "name",
      label: "Name contains",
      type: "string",
      validation: { minLength: 3 },
      hint: "Case-insensitive substring; `_` and `%` are wildcards. At least 3 characters.",
    },
    {
      key: "number",
      label: "Contact number",
      type: "number",
      validation: { integer: true },
      hint: "The customer or vendor number.",
    },
    { key: "customer", label: "Is customer", type: "select", options: yesNo },
    { key: "vendor", label: "Is vendor", type: "select", options: yesNo },
  ],
});
