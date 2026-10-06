import { getAction } from "../lib/factory.ts";

/** `GET /v1/contacts/{id}` */
export default getAction({
  key: "contact-get",
  title: "Get Contact",
  description: "Fetch one contact with roles, addresses, emails and phone numbers. The " +
    "`version` is what Update Contact needs.",
  resource: "contact",
  path: "/contacts/{id}",
  idLabel: "Contact id",
  output: [
    { key: "id", type: "string", label: "Contact id" },
    { key: "version", type: "number", label: "Version" },
    { key: "roles", type: "object", label: "Roles (customer / vendor, with numbers)" },
    { key: "company", type: "object", label: "Company details" },
    { key: "person", type: "object", label: "Person details" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],
});
