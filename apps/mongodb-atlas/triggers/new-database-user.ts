import { PROJECT_ID_PARAM, snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/database-user-list.ts";

export default snapshotTrigger({
  key: "new-database-user",
  title: "New Database User",
  description:
    "The run gets each database user newly created in the chosen project, polled from the existing `database-user-list` action (the whole list, diffed by database and username).",
  action,
  listKey: "users",
  input: (params) => ({ projectId: params.projectId }),
  idOf: (item) => `${String(item.databaseName ?? "")}/${String(item.username ?? "")}`,
  params: [PROJECT_ID_PARAM],
  output: [
    { key: "username", type: "string", label: "Username" },
    { key: "databaseName", type: "string", label: "Authentication database" },
    { key: "roles", type: "array", label: "Roles" },
    { key: "scopes", type: "array", label: "Cluster scopes (empty = every cluster)" },
  ],
  sample: {
    username: "app-reader",
    databaseName: "admin",
    roles: [{ roleName: "read", databaseName: "app" }],
    scopes: [],
  },
});
