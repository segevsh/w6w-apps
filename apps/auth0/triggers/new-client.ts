import clientList from "../actions/client-list.ts";
import { rowsOf, snapshotTrigger, str, WHOLE_LIST } from "../lib/triggers.ts";

// GET /api/v2/clients?page=…&per_page=100 — "Get clients (Applications)": no documented order, so
// the tenant's applications are snapshot-diffed (additions only; more than 5000 throws)
// (https://auth0.com/docs/api/management/v2/clients/get-clients).
export default snapshotTrigger({
  key: "new-client",
  title: "New Application",
  description: "The run gets each application (client) newly created in the Auth0 tenant.",
  output: [
    { key: "client_id", type: "string", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "app_type", type: "string", label: "Application type" },
    { key: "is_first_party", type: "boolean", label: "First party" },
  ],
  sample: {
    client_id: "client-101",
    name: "Web app",
    app_type: "regular_web",
    is_first_party: true,
  },
  rows: async (_params, ctx) =>
    rowsOf("clients")(await clientList.execute({ ...WHOLE_LIST } as never, ctx)),
  idOf: (item) => str((item as { client_id?: unknown }).client_id),
});
