import connectionList from "../actions/connection-list.ts";
import { rowsOf, snapshotTrigger, str, WHOLE_LIST } from "../lib/triggers.ts";

// GET /api/v2/connections?page=…&per_page=100 — "Get all connections": no documented order, so the
// tenant's connections are snapshot-diffed (additions only; more than 5000 throws)
// (https://auth0.com/docs/api/management/v2/connections/get-connections).
export default snapshotTrigger({
  key: "new-connection",
  title: "New Connection",
  description: "The run gets each connection (identity source) newly created in the Auth0 tenant.",
  output: [
    { key: "id", type: "string", label: "Connection ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "strategy", type: "string", label: "Strategy" },
  ],
  sample: { id: "con_abc123", name: "Username-Password-Authentication", strategy: "auth0" },
  rows: async (_params, ctx) =>
    rowsOf("connections")(await connectionList.execute({ ...WHOLE_LIST } as never, ctx)),
  idOf: (item) => str((item as { id?: unknown }).id),
});
