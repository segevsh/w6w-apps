import { snapshotList } from "../lib/snapshot.ts";
import connectionList from "../actions/connection-list.ts";

export default snapshotList<{ projectId?: string }>({
  key: "new-connection",
  title: "New Connection",
  description:
    "The run gets each newly created warehouse connection (optionally within one project).",
  params: [{
    key: "projectId",
    label: "Project ID",
    type: "string",
    default: "",
    hint: "Only this project (blank = the whole account).",
  }],
  action: connectionList,
  rows: "connections",
  input: (p) => ({ projectId: p.projectId }),
  output: [
    { key: "id", type: "number", label: "Connection ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Warehouse type" },
  ],
  sample: { id: 401, name: "Snowflake prod", type: "snowflake" },
});
