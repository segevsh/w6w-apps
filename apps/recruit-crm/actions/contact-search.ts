import { searchAction } from "../lib/params.ts";

export default searchAction({
  key: "contact-search",
  resource: "contact",
  title: "Search Contacts",
  description:
    "Find contacts by name, email or LinkedIn URL (`GET /v1/contacts/search`). Custom-field " +
    "filters are not exposed.",
  path: "/contacts",
  filters: [
    { key: "firstName", api: "first_name", label: "First name" },
    { key: "lastName", api: "last_name", label: "Last name" },
    { key: "email", api: "email", label: "Email" },
    { key: "linkedin", api: "linkedin", label: "LinkedIn URL" },
  ],
});
