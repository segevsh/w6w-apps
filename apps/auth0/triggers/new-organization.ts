import organizationList from "../actions/organization-list.ts";
import { rowsOf, snapshotTrigger, str, WHOLE_LIST } from "../lib/triggers.ts";

// GET /api/v2/organizations?page=…&per_page=100 — "Get organizations": no documented order, so the
// tenant's organizations are snapshot-diffed (additions only; more than 5000 throws)
// (https://auth0.com/docs/api/management/v2/organizations/get-organizations).
export default snapshotTrigger({
  key: "new-organization",
  title: "New Organization",
  description: "The run gets each organization newly created in the Auth0 tenant.",
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "display_name", type: "string", label: "Display name" },
  ],
  sample: { id: "org_abc123", name: "acme", display_name: "Acme Inc." },
  rows: async (_params, ctx) =>
    rowsOf("organizations")(await organizationList.execute({ ...WHOLE_LIST } as never, ctx)),
  idOf: (item) => str((item as { id?: unknown }).id),
});
