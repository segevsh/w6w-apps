import { clerkNewest } from "../lib/triggers.ts";
import organizationList from "../actions/organization-list.ts";

export default clerkNewest({
  key: "new-organization",
  title: "New Organization",
  description: "The run gets each newly created organization.",
  action: organizationList,
  input: () => ({}),
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "created_at", type: "number", label: "Created at (Unix ms)" },
  ],
  sample: {
    id: "org_2abc123",
    name: "Example Org",
    slug: "example-org",
    created_at: 1794128400000,
  },
});
