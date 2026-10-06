import { searchAction } from "../lib/params.ts";

export default searchAction({
  key: "candidate-search",
  resource: "candidate",
  title: "Search Candidates",
  description:
    "Find candidates by name, email or LinkedIn URL (`GET /v1/candidates/search`). Filters are " +
    "combined; custom-field filters are not exposed.",
  path: "/candidates",
  filters: [
    { key: "firstName", api: "first_name", label: "First name" },
    { key: "lastName", api: "last_name", label: "Last name" },
    { key: "email", api: "email", label: "Email" },
    { key: "linkedin", api: "linkedin", label: "LinkedIn URL" },
  ],
});
